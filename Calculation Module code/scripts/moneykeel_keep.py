"""What the founder typed, carried across a rebuild.

THE PROBLEM THIS FIXES (founder, 2026-08-26: "what if we change something in master file later").
The master file is GENERATED. Every build writes a fresh workbook, and until today the builder
wrote an empty string into the two columns only he fills — his answers to the numbered questions,
and his own name for each figure — plus the decision column on core_screens. So anything he typed
was erased by the next build, silently. Thirty-three numbered questions had nowhere safe to be
answered.

THE RULE. A thing is authored in exactly one place. Everything he authors lives in the workbook
and is READ BACK before the workbook is overwritten; everything I author is generated and never
typed. The header of a code file and every generated column are printed views — never a source.

KEYED BY IDENTIFIER, NEVER BY ROW. Rows move as figures are added, folded and re-sorted. An answer
follows its identifier, so re-ordering the file cannot shuffle his answers onto the wrong rows.

NOTHING IS DROPPED IN SILENCE. If an answer cannot be placed because its row no longer exists, the
build says so and names it. An answer that quietly disappears is worse than no read-back at all.

THE BUILD'S OWN TEXT IN A COLUMN OF HIS IS NEVER READ BACK AS HIS (2026-10-22, Performance audit; workplan row "The
master file reads its own text back as his in ROW VERIFIED"). Two of his columns also carry text the build prints:
ROW VERIFIED gets a declared row's own sentence until he writes a mark there, and YOUR ANSWER gets each answer the
decision log holds for the row's questions, printed under whatever he typed. read() took every word in those columns
as his, so a printed sentence came back the next build as if he had typed it, and stayed frozen: MK-PF-M-008 and
MK-XS-M-004 kept "RULED? NOT YET" after they were ruled, MK-NW-M-002, MK-NW-M-047, MK-PF-M-016 and MK-PF-M-017 kept a
ruled date their declarations had moved past, and four answer cells kept an older printing of Q10, Q51, Q52 and Q53.
His part of a cell is what is left once the build's own text is taken out — the build's sentences are matched whole
and only at the places the build puts them, so a sentence of his is never cut. self_check() proves it on cells made
up here, never on the master itself, and the build stops if it fails.
"""
import os
import re
import openpyxl

ROW_VERIFIED = 'ROW VERIFIED — founder, date and how'
YOUR_ANSWER = 'YOUR ANSWER — use the same number'
_DOOR = r'MK-[A-Z]{2}-O-\d{3} [A-Za-z_][A-Za-z0-9_]*'
# the two sentences build-moneykeel-master.py (declared_row) writes into ROW VERIFIED — matched whole, from the start
# of the cell. The build checks every sentence it writes there against these, so a reworded sentence stops the build
# instead of coming back as his next time.
BUILDER_SENTENCES = (
    re.compile(r'TESTED, NOT VERIFIED — you ruled on this row [^;\n]+; the figure, its formula, inputs and refusal live in ' + _DOOR),
    re.compile(r'RULED\? NOT YET — read this row and say yes, or say what changes\. Nothing moves behind ' + _DOOR + r' until you do\.'),
)
# one answer the build prints into YOUR ANSWER: "Q51 — ANSWERED 2026-09-30: <his words, from the decision log>
# \n\nBUILT: <what was built>" — at the start of the cell or after a blank line, ending where the next printed answer
# begins or the cell ends
_ANSWER_HEAD = r'Q\d\d — ANSWERED \d{4}-\d{2}-\d{2}: '
_ANSWER_BLOCK = re.compile(r'(?:\A|\n\n)(' + _ANSWER_HEAD + r'.*?\n\nBUILT: .*?)(?=\n\n' + _ANSWER_HEAD + r'|\Z)', re.S)


def split(col, value):
    """(his part, [the build's own text taken out]) for one cell of one of his columns.

    ROW VERIFIED: a cell that starts with the build's sentence keeps only what follows it (his mark, if he wrote one
    after it). YOUR ANSWER: every printed answer is taken out; what he typed above them is his. Any other column, and
    any cell the build's text does not start, is his whole."""
    s = str(value).strip() if value is not None else ''
    if col == ROW_VERIFIED:
        for p in BUILDER_SENTENCES:
            m = p.match(s)
            if m:
                return s[m.end():].strip(), [m.group(0)]
        return s, []
    if col == YOUR_ANSWER:
        out = [m.group(1) for m in _ANSWER_BLOCK.finditer(s)]
        return (_ANSWER_BLOCK.sub('', s).strip() if out else s), out
    return s, []

SCREEN_TABS = ('multiple_screens', 'home', 'networth', 'performance', 'plan', 'cashflow', 'menu')

# tab → the columns HE owns. Everything not listed here is generated and is overwritten every build.
YOURS = {t: ['YOUR ANSWER — use the same number', 'Your name for it (72-metric file)',
             'Founder comment — 2026-08-26 (the column it was written on)',
             'Inputs — approved list (founder, dated)',
             'ROW VERIFIED — founder, date and how']
         for t in SCREEN_TABS}
YOURS['core_screens'] = ['JJ — Decision (Y/N)']
YOURS['functions_from_code'] = ['Founder comment — 2026-08-26 (the column and metric row it was written on)']
YOURS['inputs'] = []          # nothing of his here yet; listed so adding one is a one-line change

# which column holds the identifier a value is keyed to
KEY_COL = {t: 'Metric ID' for t in SCREEN_TABS}
KEY_COL['core_screens'] = 'Screen name'
KEY_COL['inputs'] = 'Input ID'
KEY_COL['functions_from_code'] = 'Function ID'


def read(path):
    """{(tab, identifier, column): what he typed} from the workbook as it stands on disk."""
    return read_split(path)[0]


def read_split(path):
    """({(tab, identifier, column): what he typed}, [(tab, identifier, column, the build's own text set aside)])."""
    if not os.path.exists(path):
        return {}, []
    wb = openpyxl.load_workbook(path, data_only=True)
    out = _read_wb(wb)
    wb.close()
    return out


def _read_wb(wb):
    kept, set_aside = {}, []
    for tab, cols in YOURS.items():
        if tab not in wb.sheetnames or not cols:
            continue
        head = [str(c.value) if c.value is not None else '' for c in wb[tab][1]]
        if KEY_COL[tab] not in head:
            continue
        ki = head.index(KEY_COL[tab])
        for row in wb[tab].iter_rows(min_row=2, values_only=True):
            key = row[ki] if ki < len(row) else None
            if not key:
                continue
            for col in cols:
                if col not in head:
                    continue
                i = head.index(col)
                val = row[i] if i < len(row) else None
                if val is None or not str(val).strip():
                    continue
                his, builders = split(col, val)
                for b in builders:
                    set_aside.append((tab, str(key).strip(), col, b))
                if not builders:
                    kept[(tab, str(key).strip(), col)] = val      # nothing of the build's in it: kept exactly as he typed it
                elif his:
                    kept[(tab, str(key).strip(), col)] = his
    return kept, set_aside


def self_check():
    """The reader, fed cells whose answer is known — made up here, never read from the master, so resolving anything
    in the master cannot make this pass or fail. Returns the list of failures (empty = it still tells his from ours).
    Under the reader before 2026-10-22 checks 1, 2, 6 and 7 fail: it read every word in his columns as his."""
    door = 'MK-NW-O-008 thePerformance'
    tested = 'TESTED, NOT VERIFIED — you ruled on this row 2026-10-04; the figure, its formula, inputs and refusal live in ' + door
    not_yet = 'RULED? NOT YET — read this row and say yes, or say what changes. Nothing moves behind ' + door + ' until you do.'
    a1 = 'Q51 — ANSWERED 2026-09-30: Q51 -approved.\n\nBUILT: The Home line is built and pinned.'
    a2 = 'Q33 — ANSWERED 2026-10-21: each class its own index.\n\nBUILT: Two paragraphs.\n\nThe second one.'
    cases = [  # (identifier, ROW VERIFIED cell, YOUR ANSWER cell, his ROW VERIFIED expected, his YOUR ANSWER expected)
        ('MK-PF-M-901', tested, None, None, None),                                       # 1 the build's sentence, ruled
        ('MK-PF-M-902', not_yet, None, None, None),                                      # 2 the build's sentence, not ruled
        ('MK-PF-M-903', 'VERIFIED 2026-10-22 — read on the phone', None, 'VERIFIED 2026-10-22 — read on the phone', None),
        ('MK-PF-M-904', tested + '\nVERIFIED 2026-10-22 JJ', None, 'VERIFIED 2026-10-22 JJ', None),   # 4 his mark under ours
        ('MK-PF-M-905', 'I said RULED? NOT YET is a question — take it out', None,
         'I said RULED? NOT YET is a question — take it out', None),                    # 5 our words inside his sentence
        ('MK-PF-M-906', None, a1, None, None),                                           # 6 a printed answer only
        ('MK-PF-M-907', None, 'yes\n\n' + a1 + '\n\n' + a2, None, 'yes'),                 # 7 his word above two printed
        ('MK-PF-M-908', None, 'Q46: show gross income first', None, 'Q46: show gross income first'),
    ]
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'performance'
    ws.append(['Metric ID', ROW_VERIFIED, YOUR_ANSWER])
    for c in cases:
        ws.append([c[0], c[1], c[2]])
    kept, aside = _read_wb(wb)
    self_check.ran = len(cases)
    bad = []
    for n, (ident, _rv, _ya, want_rv, want_ya) in enumerate(cases, 1):
        for col, want in ((ROW_VERIFIED, want_rv), (YOUR_ANSWER, want_ya)):
            got = kept.get(('performance', ident, col))
            if (str(got).strip() if got is not None else None) != want:
                bad.append('case %d %s · %s: read back %r, should be %r' % (n, ident, col[:12], got, want))
    if sorted(b for (_t, _k, _c, b) in aside) != sorted([tested, not_yet, tested, a1, a1, a2]):
        bad.append('the build\'s own text set aside is not exactly the six sentences and answers put in: %r' % aside)
    return bad


def apply(wb, kept):
    """Write them back into the freshly built workbook. Returns (placed, lost)."""
    placed, lost = 0, []
    for (tab, key, col), val in sorted(kept.items()):
        if tab not in wb.sheetnames:
            lost.append((tab, key, col, val)); continue
        ws = wb[tab]
        head = [str(c.value) if c.value is not None else '' for c in ws[1]]
        if KEY_COL[tab] not in head:
            lost.append((tab, key, col, val)); continue
        if col not in head:
            # a column HE owns that the build does not write (his comment column, 2026-09-08):
            # create it so his words land, rather than reporting them lost
            ws.cell(1, len(head) + 1).value = col
            ws.cell(1, len(head) + 1).font = ws.cell(1, 1).font.copy(); ws.cell(1, len(head) + 1).fill = ws.cell(1, 1).fill.copy()
            head.append(col)
        ki, ci = head.index(KEY_COL[tab]), head.index(col)
        hit = False
        for r in range(2, ws.max_row + 1):
            if str(ws.cell(r, ki + 1).value or '').strip() == key:
                ws.cell(r, ci + 1).value = val
                placed += 1; hit = True; break
        if not hit:
            lost.append((tab, key, col, val))
    return placed, lost


def report(placed, lost):
    """What the build says out loud. A lost answer is named, never a count on its own."""
    lines = ['kept from the last build: %d of his own entries carried over' % (placed + len(lost))]
    lines.append('  placed on their row: %d' % placed)
    if lost:
        lines.append('  COULD NOT BE PLACED: %d — the row they were keyed to is gone.' % len(lost))
        for tab, key, col, val in lost:
            lines.append('    %s · %s · %s = %s' % (tab, key, col, str(val)[:70]))
        lines.append('  Nothing was thrown away: they are listed above and in kept-but-unplaced.md')
    return '\n'.join(lines)


def write_orphans(lost, path):
    """An answer whose row vanished is written to disk, so it survives even this build."""
    if not lost:
        if os.path.exists(path):
            os.remove(path)
        return
    with open(path, 'w') as f:
        f.write('# Answers that could not be placed on a row\n\n'
                'Each of these was typed into the master file, and the row it was keyed to no '
                'longer exists — the figure was folded into another identifier, renamed, or cut. '
                'They are written here so a rebuild cannot lose them. Move each one onto its new '
                'row, or say it is no longer needed.\n\n')
        for tab, key, col, val in lost:
            f.write('- **%s** · `%s` · %s\n\n      %s\n\n' % (tab, key, col, val))
