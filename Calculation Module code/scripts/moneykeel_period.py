"""The Period column of a declared row — as of when, over what window — derived from the declaration (2026-10-22).

THE PROBLEM THIS FIXES (Performance audit; workplan row "Every declared figure's Period column reads 'as of today',
window figures included"). declared_row printed "a month" or "a year" for a figure shown per month or per year, and
"as of today" for every other one — so Return, Wealth generated, the walk's lines and the market figure, all over the
window a person picks, read "as of today" on the master.

THE RULE, read from the declaration and the screen's code, never typed per figure:
  1. a declaration that states its own period (a `period` field) prints it — except 'the window picked', which is
     rule 3 for a figure whose words do not say window;
  2. one shown per month or per year prints "a month" / "a year";
  3. one whose own words say it is over a window — "window", or "the same dates / days" as another figure — prints the
     window, and for each screen it is on, that screen's window choices as its code lists them;
  4. anything else prints "as of today".
A screen whose code lists no window choices in a form read here is SAID so on the row and counted by the build — never
filled in from memory.
"""
import os
import re

_WINDOW_WORDS = re.compile(r'\bwindows?\b|\bsame (?:dates|days)\b', re.I)
_SINCE = '<the first day on record>'
STATS = {'own period': 0, 'per month or year': 0, 'over a window': 0, 'as of today': 0}
UNREAD = set()          # screen files a window figure is on whose window choices this could not read
_CACHE = {}


def _src(path):
    if path not in _CACHE:
        _CACHE[path] = open(path, encoding='utf-8').read() if path and os.path.exists(path) else ''
    return _CACHE[path]


def _label(lit):
    """a label as the code writes it — a template's ${…} is the first day on record (the Since window)"""
    body = lit[1:-1]
    return re.sub(r'\$\{[^}]*\}', _SINCE, body)


def window_choices(path, domain='src/domain/performance/index.ts'):
    """How the screen at `path` sets its window, in words, read from its code — or None when it lists none read here."""
    src = _src(path)
    if not src:
        return None
    # a list of windows with their labels: const WINDOWS … = [{ key: '1M', label: '1M' }, …]
    m = re.search(r'const WINDOWS\b[^=]*=\s*\[(.*?)\]\s*(?:as const)?;', src, re.S)
    if m:
        labels = re.findall(r"label:\s*(`[^`]*`|'[^']*'|\"[^\"]*\")", m.group(1))
        if labels:
            return 'picked from ' + ' · '.join(_label(x) for x in labels)
    # a list of keys and the words for them: const WINDOW_KEYS = ['SINCE', '1M', …]; const WINDOW_WORDS = { YTD: 'This year' }
    m = re.search(r'const WINDOW_KEYS\s*=\s*\[(.*?)\]', src, re.S)
    if m:
        keys = re.findall(r"'([^']+)'", m.group(1))
        w = re.search(r'const WINDOW_WORDS[^=]*=\s*\{(.*?)\}', src, re.S)
        words = dict(re.findall(r"'?([A-Za-z0-9]+)'?\s*:\s*'([^']*)'", w.group(1))) if w else {}
        if keys:
            return 'picked from ' + ' · '.join(('Since ' + _SINCE) if k == 'SINCE' else words.get(k, k) for k in keys)
    # the chips are the domain's own list of windows: PERIODS.map(…)
    if re.search(r'\bPERIODS\.map\(', src):
        d = re.search(r'export const PERIODS\b[^=]*=\s*\[(.*?)\]', _src(domain), re.S)
        if d:
            opens = re.search(r"params\.period\)+\s*\?[^:]*:\s*'([^']+)'", src)
            return ('picked from ' + ' · '.join(re.findall(r"'([^']+)'", d.group(1)))
                    + ((' (it opens on the window picked on the page it came from, else %s)' % opens.group(1)) if opens else ''))
    # one window handed to the window functions, fixed: windowStartKey('1M', …) / buildPerformance(…, '1M', …)
    fixed = set(re.findall(r"windowStartKey\(\s*'([A-Z0-9]+)'", src)) | set(
        re.findall(r"buildPerformance\([^;]*?'(1M|3M|6M|YTD|1Y|2Y|SINCE)'", src))
    if len(fixed) == 1:
        return fixed.pop() + ', fixed'
    return None


def period_of(f, file_of_route, name_of_route):
    """The Period column for one declared figure. `file_of_route(route)` → the screen's file; `name_of_route(route)` →
    the screen's name as the master prints it."""
    # 'the window picked' declared: a figure over the screen's window whose own words do not say so (MK-PF-M-003, the
    # walk's title) — its screens' choices are read from their code like every other window figure's
    own_window = str(f.get('period') or '').strip().lower() == 'the window picked'
    if f.get('period') and not own_window:
        STATS['own period'] += 1
        return str(f['period'])
    if f.get('per') and not own_window:
        STATS['per month or year'] += 1
        return 'a ' + f['per']
    text = ' '.join(str(f.get(k) or '') for k in ('label', 'answers', 'formula', 'grain', 'note', 'refusal'))
    if not own_window and not _WINDOW_WORDS.search(text):
        STATS['as of today'] += 1
        return 'as of today'
    STATS['over a window'] += 1
    parts = []
    for r in f.get('screens') or []:
        path = file_of_route(r)
        how = window_choices(path) if path else None
        if how is None:
            UNREAD.add(path or r)
            how = 'the window that screen shows (its file, %s, lists no window choices the build can read)' % (path or 'none for ' + r)
        parts.append('%s: %s' % (name_of_route(r), how))
    return 'Over a window. ' + '. '.join(parts) + '.'
