"""REFUSE TO WRITE OVER A WORKBOOK HE HAS OPEN.

Founder, 2026-09-30, after reading a sentence I had already removed:
*"WTF — '1. Is this row right …' is still in the file. Did you re-write the file or forgot and waiting
for me to tell you like last time?"*

I had rewritten it. The files on disk were clean. What he was reading was the copy Excel had loaded
BEFORE the rebuild — writing over an open workbook does not refresh what is on his screen, so a
finished job looked unfinished and he spent his time proving it.

Excel leaves a lock file beside an open workbook, named `~$<file>`. Every builder now checks for it
and STOPS with the file to close, rather than writing something he cannot see.

    from moneykeel_open_workbook import refuse_if_open
    refuse_if_open(OUT)
"""
import os, sys


def is_open(path):
    """Excel's own lock file beside the workbook — `~$name.xlsx` in the same folder."""
    d, n = os.path.dirname(path) or '.', os.path.basename(path)
    return os.path.exists(os.path.join(d, '~$' + n))


def refuse_if_open(*paths):
    shut = [p for p in paths if is_open(p)]
    if not shut:
        return
    print('\nBUILD STOPPED — %s open in Excel. Writing it would leave your screen showing the OLD copy,\n'
          'which is how a finished job comes to look unfinished.\n' % ('this file is' if len(shut) == 1 else 'these files are'))
    for p in shut:
        print('   close:  ' + p)
    print('\nClose it and run this again. Nothing has been written.')
    sys.exit(1)
