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
"""
import os
import openpyxl

SCREEN_TABS = ('multiple_screens', 'home', 'networth', 'performance', 'plan', 'cashflow', 'menu')

# tab → the columns HE owns. Everything not listed here is generated and is overwritten every build.
YOURS = {t: ['YOUR ANSWER — use the same number', 'Your name for it (72-metric file)']
         for t in SCREEN_TABS}
YOURS['core_screens'] = ['JJ — Decision (Y/N)']
YOURS['inputs'] = []          # nothing of his here yet; listed so adding one is a one-line change

# which column holds the identifier a value is keyed to
KEY_COL = {t: 'Metric ID' for t in SCREEN_TABS}
KEY_COL['core_screens'] = 'Screen name'
KEY_COL['inputs'] = 'Input ID'


def read(path):
    """{(tab, identifier, column): what he typed} from the workbook as it stands on disk."""
    if not os.path.exists(path):
        return {}
    wb = openpyxl.load_workbook(path, data_only=True)
    kept = {}
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
                if val is not None and str(val).strip():
                    kept[(tab, str(key).strip(), col)] = val
    wb.close()
    return kept


def apply(wb, kept):
    """Write them back into the freshly built workbook. Returns (placed, lost)."""
    placed, lost = 0, []
    for (tab, key, col), val in sorted(kept.items()):
        if tab not in wb.sheetnames:
            lost.append((tab, key, col, val)); continue
        ws = wb[tab]
        head = [str(c.value) if c.value is not None else '' for c in ws[1]]
        if col not in head or KEY_COL[tab] not in head:
            lost.append((tab, key, col, val)); continue
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
