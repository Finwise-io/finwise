"""WHICH TAB A DECISION BELONGS ON — read from the words, never assumed.

The design Changelog's "Sheet" column is free text: 208 distinct values across 251 rows, from
"Net worth" to "Plan · Retire — 'Pay off the mortgage early' MOVES to Cash flow · Debt". A decision
is filed by the screens its words NAME, and a row naming two or more parent screens goes to
`multiple_screens` — the same convention the calculation master uses for a figure on three screens.

THE COVERAGE ASSERTION IS THE POINT (CLAUDE.md § A GUARD MUST PROVE IT LOOKED). `classify` returns the
tab AND whether it matched anything. A row that matched nothing is NOT quietly filed under
multiple_screens: it is returned as unmatched, counted, and the extract stops until it is classified.
Filing by silence is exactly how step B6 came to read 42 of 251 rows and report itself clean.
"""
import re

# the words each parent screen is actually called in his files — taken from the Sheet values, the
# route list and his own wording, not from memory of them
WORDS = {
    'networth':    [r'net worth', r'\bnw\b', r'asset class', r'asset classif', r'account detail',
                    r'holdings? account', r'alternatives', r'bond', r'itemi', r'connected account',
                    r'connect flow', r'transactions?\b', r'debts?\b', r'donut', r'composition bar'],
    'performance': [r'performance', r'\binvest\b', r'invest\b', r'holding detail', r'returns?\b',
                    r'market value', r'wealth generated'],
    'cashflow':    [r'cash ?flow', r'\bincome\b', r'base pay', r'spending', r'expenses?\b', r'budget',
                    r'paycheck', r'take-?home', r'tax band', r'dividends?', r'401\(?k\)?', r'statutory',
                    r'filing status', r'bill', r'credit'],
    'plan':        [r'\bplan\b', r'retirement', r'retire\b', r'the odds', r'\bodds\b', r'social security',
                    r'\bss\b', r'goals?\b', r'roth', r'big costs', r'multi-goal', r'nest egg',
                    r'withdrawal', r'mortgage', r'treasury', r'cockpit', r'will[- ]it[- ]last'],
    'home':        [r'\bhome\b', r'app root', r'first-run', r'onboarding', r'glance', r'insights?\b'],
    'menu':        [r'\bmenu\b', r'settings', r'\btips\b', r'stress test', r'rewards', r'education',
                    r'insurance', r'worth a look', r'contribution room'],
}
# these say "every screen" — they are cross-screen by their own words
APP_WIDE = [r'all screens', r'app-?wide', r'navigation', r'all adoption', r'all five tabs',
            r'screen map', r'screen architecture', r'screen inventory', r'all surfaces',
            r'every screen', r'heading hierarchy', r'info dot', r'\bwords and precision\b']
# these are about HOW WE WORK or about the standards, and govern no single screen
PROCESS = [r'\bprocess\b', r'\bstandard', r'\bcode\b', r'\btests?\b', r'identifiers?\b',
           r'master file', r'master monitor', r'\brelease\b', r'build \d', r'^engine', r'\bengines?\b',
           r'\bprd\b', r'record correction', r'claude design handoff', r'august 14th design',
           r'\brulings\b', r'\bbug\b', r'\bwording\b',
           # personas and briefs — a brief's figures are verified by a test (his 2026-08-14 order),
           # so a decision about one is a decision about how we work, not about a screen. Found by
           # the coverage assertion: "Pat's numbers now follow from Pat's holdings" matched nothing.
           r'\bbrief', r'\bpersona', r"\bpat's\b", r"\bray\b", r"\bjune\b"]

def classify_row(sheet, change=''):
    """A CHANGELOG ROW'S TAB. The Sheet column IS the screen designation, so it is tried alone first;
    the change text is a fallback only. Matching 200 characters of change text up front filed 117 of
    251 rows as cross-screen because rows incidentally say "mortgage" or "info dot" — the classifier
    was reading words that were not about which screen the decision governs."""
    tab, ok = classify(sheet)
    if ok:
        return tab, True
    return classify(str(sheet or '') + ' ' + str(change or '')[:200])


def classify(text):
    """(tab, matched) — the tab this decision belongs on, and whether anything matched at all."""
    t = ' ' + str(text or '').lower() + ' '
    if any(re.search(p, t) for p in APP_WIDE):
        return 'multiple_screens', True
    hits = sorted({fam for fam, pats in WORDS.items() if any(re.search(p, t) for p in pats)})
    if len(hits) > 1:
        return 'multiple_screens', True          # names two or more parent screens — one row, cross-screen
    if len(hits) == 1:
        return hits[0], True
    if any(re.search(p, t) for p in PROCESS):
        return 'process-and-standards', True
    return 'process-and-standards', False        # matched NOTHING — the caller must not accept this
