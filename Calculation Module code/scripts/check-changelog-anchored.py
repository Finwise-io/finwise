#!/usr/bin/env python3
"""EVERY DECISION HE MADE IS IN THE LEDGER — the gate behind "how do I trust it".

FOUNDER, 2026-09-28: *"This is the 4th time, you did not read the approved mocks. How do I trust what
you built actually aligns with my rulings and mockups - considering you missed it 4 times."*

The fourth miss was not a mock I failed to read. It was a RULING that existed in exactly one file.
On 2026-09-12 he corrected income-end-to-end v07 — "one card disagreeing with itself; corrected to
the take-home line". That reached the design Changelog and the mock. It reached no ledger, no
standard and no test, so nothing in the code held it, and the same disagreement was still live one
screen over sixteen days later.

`check-rulings-sync.py` already checks that every ruling IN the ledger is anchored to a test or a
file check. It cannot check a decision that never became a ledger row. That is the hole, and this is
the gate over it: the design Changelog is the founder's own record of what he approved, so every row
he approved must be traceable to a ruling in the ledger — where a test can be hung on it.

EVERY row he approved needs its OWN entry in moneykeel_changelog_anchors.json, naming either

  · the RULING in the ledger that governs it — and that ruling must exist, or this fails; or
  · why it is NOT a ruling — a defect I fixed, a guard I added, a file I moved. Mislabelled rows
    exist ("Approved by JJ" on a test-fixture fix), and calling those rulings would turn the ledger
    from an index into noise.

A DATE MATCH IS NOT ACCEPTED, and that is deliberate. Matching a row to any ruling of the same day
was written first and thrown away: one ruling would have satisfied a whole day of rows, which is the
same "looks green, proves nothing" shape as the UI-test gate that passed because git returned
nothing, and as the orphan-route guard that was built too narrow three times. A gate that reports
clean without looking is worse than no gate, because it gets trusted.

The ratchet: the number of rows anchored to nothing may only fall.
"""
import json, os, re, sys, glob

# every form the 'Approved by' column actually uses for him — taken from the column, not from memory
HIS_DECISION = re.compile(r'\b(jj|founder|approved mock)\b', re.I)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LEDGER = json.load(open(os.path.join(HERE, 'moneykeel_rulings.json')))
ANCHORS = os.path.join(HERE, 'moneykeel_changelog_anchors.json')
# THE RATCHET, set 2026-09-28 from what is actually there: 195 of his 238 recorded decisions reach no
# ruling. It is set to the true number rather than to 0 so the build is not permanently red — the same
# pattern D1 uses for its 18 owed imports — and it may ONLY FALL. Every build prints how many are
# owed, so the debt is in front of us instead of in my head. It is NOT a pass: 195 decisions of his
# are still held by a changelog row and nothing else.
UNANCHORED_ALLOWED = 195

try:
    import openpyxl
except ImportError:
    print('  (openpyxl not present — the changelog gate is skipped)'); sys.exit(0)

anchors = json.load(open(ANCHORS)) if os.path.exists(ANCHORS) else {}
dates = {str(r.get('date', ''))[:10] for r in LEDGER}

def changelog_rows():
    """the newest design workbook's Changelog — the founder's own record of what he approved"""
    files = sorted(glob.glob(os.path.join(ROOT, 'docs/FCC-core-55-70/FCC-core-detailed-design-v*.xlsx')))
    if not files:
        return None, []
    ws = openpyxl.load_workbook(files[-1], read_only=True)['Changelog']
    out = []
    global skipped, seen
    skipped, seen = [], 0
    for r in ws.iter_rows(values_only=True):
        if not r or len(r) < 5 or str(r[0] or '').strip().lower() == 'date':
            continue
        if not str(r[0] or '')[:4].isdigit():
            continue                      # not a dated row
        seen += 1
        # WHO APPROVED IT — read from the column's ACTUAL values, never from memory of them.
        # Built on 2026-09-28 as `.startswith('JJ')`, which saw 42 of the 251 rows. The column also
        # says "Founder (chat 2026-08-11)", "Founder — DECIDED 2026-07-28", "Approved mock is the
        # spec" and a dozen other forms: 238 rows record HIS decision, not 42. So the gate reported
        # "✓ all 42 reach the ledger" while 196 of his decisions were outside its net — the exact
        # fault this file's own docstring warns about, written in the same hour. He asked: "Do you
        # not have a rule never to work off memory?" Yes. This is it, read from the data.
        who = str(r[4] or '')
        if not HIS_DECISION.search(who):
            # NOT SILENTLY DROPPED. Every row this gate does not treat as his is counted and, below,
            # must be explainable — a filter that quietly discards what it does not recognise is how
            # this gate came to see 42 of 251 rows and report itself clean.
            skipped.append((str(r[0])[:10] + ' | ' + str(r[1] or '').strip(), who))
            continue
        out.append({'date': str(r[0])[:10], 'sheet': str(r[1] or '').strip(), 'change': str(r[2] or '')})
    return os.path.basename(files[-1]), out

name, rows = changelog_rows()
if name is None:
    print('  (no design workbook found — the changelog gate is skipped)'); sys.exit(0)

ids = {r.get('id') for r in LEDGER} | {r.get('ruling', '')[:60] for r in LEDGER}
titles = {str(r.get('id') or '') for r in LEDGER}
loose, dangling = [], []
for r in rows:
    key = r['date'] + ' | ' + r['sheet']
    a = anchors.get(key)
    if not (isinstance(a, str) and a.strip()):
        loose.append(key + '  —  ' + r['change'][:110].replace('\n', ' '))
        continue
    if a.startswith('NOT A RULING'):
        continue
    # it names ruling(s): every identifier it names must actually be in the ledger
    named = re.findall(r'\bG\d+\b', a)
    missing = [n for n in named if n not in titles]
    if missing:
        dangling.append(key + '  —  names ' + ', '.join(missing) + ', which the ledger does not carry')

print('── B6 · every decision he approved is in the rulings ledger')
print('   %s · %d rows recording HIS decision · %d ruling(s) in the ledger' % (name, len(rows), len(LEDGER)))
if loose:
    print('   %d of them are anchored to NOTHING — a decision living in one file only.' % len(loose))
    print('   The ratchet allows %d. It may only fall; every one of these is a decision of his that no' % UNANCHORED_ALLOWED)
    print('   test can be hung on. The oldest five, so they stay visible:')
    for l in loose[:5]:
        print('     ' + l)
    print('     … and %d more (run this script alone to list them all).' % max(0, len(loose) - 5))
if dangling:
    print('   %d row(s) name a ruling that is not in the ledger:' % len(dangling))
    for l in dangling:
        print('     ' + l)
if len(loose) + len(dangling) > UNANCHORED_ALLOWED:
    print('\n   BUILD STOPPED. Put each one in moneykeel_rulings.json, or record in')
    print('   moneykeel_changelog_anchors.json why it is not a ruling. A decision held only by my')
    print('   memory of a changelog row is what produced the 2026-09-12 miss.')
    sys.exit(1)
print('   ✓ %d of %d reach the ledger by name, where a test can hold them.' % (len(rows) - len(loose), len(rows)))

# ── THE COVERAGE ASSERTION ──────────────────────────────────────────────────────────────────────
# THE ONE CONTROL THAT WOULD HAVE CAUGHT THIS GATE'S OWN FAULT (2026-09-28). He asked: "How can you
# break your own rule? Isn't that the whole purpose of a rule?" The rule — never work off memory —
# has no executable check, so it was held by my attention, and my attention is what failed. What IS
# checkable is the SHAPE the failure always takes: a guard filters records with a pattern I typed
# from memory, does not recognise most of them, and drops them in silence. Every guard of mine that
# was built too narrow has that signature.
#
# So this gate now has to account for every row in the sheet. Rows it does not treat as his must
# match a NAMED list of who else writes there. A new label nobody has classified fails the build,
# which means a filter can no longer be wrong quietly — it can only be wrong loudly.
NOT_HIS = ['claude', 'recorded by audit', 'doc correction', 'me — no ruling required', 'me - no ruling required']
unexplained = [(k, w) for k, w in skipped if not any(n in w.lower() for n in NOT_HIS)]
print('   coverage: %d dated rows in the sheet · %d treated as his · %d as mine' % (seen, len(rows), len(skipped)))
if unexplained:
    print('   %d row(s) this gate neither treats as his NOR recognises as mine — the filter is too narrow:' % len(unexplained))
    for k, w in unexplained[:10]:
        print('     %s  —  "Approved by" says %r' % (k, w[:50]))
    print('\n   BUILD STOPPED. Widen HIS_DECISION or add the label to NOT_HIS. A row this gate does not')
    print('   classify is a row it silently discards, which is how it came to report 42 of 251 as clean.')
    sys.exit(1)
if seen != len(rows) + len(skipped):
    print('\n   BUILD STOPPED. %d dated rows read, %d classified — %d unaccounted for.'
          % (seen, len(rows) + len(skipped), seen - len(rows) - len(skipped)))
    sys.exit(1)
print('   ✓ every dated row in the sheet is accounted for — none dropped in silence.')

# ── THE OTHER DIRECTION (founder, 2026-10-07, DEC-2634) ─────────────────────────────────────────
# B6 above asks whether every Changelog row of his reaches the ledger. It never asked the reverse —
# whether every decision of his reached the Changelog — and the Changelog had no row from 2026-09-27
# to 2026-10-07 while 52 decisions were made. Since the one-master rule (2026-09-27) a decision is
# recorded in the log first and the Changelog the same day; a decision whose sources name no Changelog
# file is a decision living in one file only. Zero is the number, and the build stops above it.
LOG = json.load(open(os.path.join(ROOT, 'Calculation Module code/scripts/moneykeel_decisions.json')))['rows']
since = [r for r in LOG if str(r.get('decided', ''))[:10] >= '2026-09-27' and r.get('in_use') == 'IN USE']
no_row = [r['id'] + ' (' + str(r.get('decided'))[:10] + ')' for r in since if 'Changelog' not in str(r.get('source', ''))]
print('   decisions of his since the one-master rule (2026-09-27): %d · without a Changelog row: %d' % (len(since), len(no_row)))
if no_row:
    print('   BUILD STOPPED. These decisions have no Changelog row — write the row (and its anchor) the same day:')
    for x in no_row[:20]:
        print('     ' + x)
    sys.exit(1)
