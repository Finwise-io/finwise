"""Is a row still live, and when did it last change? Founder ruling 2026-08-27.

TWO COLUMNS, ONE PURPOSE — knowing what is still real. A master file that only lists what exists
today cannot tell you what was retired, so a figure quietly disappears and nobody notices. And a
file with no dates cannot tell you what moved this week.

WHY A LEDGER RATHER THAN A BUILD DATE. The build runs many times a day. If the date came from the
clock every row would say today, which is worse than no date at all — it would look like everything
changed and mean nothing. So the content of each row is hashed and kept: the date only moves when
the row's own content moves. A row untouched since August still says August in December.

WHAT THE THREE STATES MEAN, per moneykeel_naming_spec_unique-identifier_v01.md:
  ACTIVE          it exists in the code or on a screen today.
  SUPERSEDED      the same thing under another identifier now; the survivor is named. Rule 3.
  DECOMMISSIONED  it was here and is not any more. Its number is retired, never reused. Rule 2.
"""
import hashlib, json, os

LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'moneykeel_row_history.json')


def _load():
    return json.load(open(LEDGER)) if os.path.exists(LEDGER) else {'rows': {}, 'note': (
        'When each row last CHANGED, not when the build last ran. Keyed by identifier; the value is '
        'a hash of the row content and the date that hash last moved.')}


class History:
    """Opened once per build, saved once at the end."""

    def __init__(self, today):
        self.d = _load()
        self.today = today
        self.seen = set()

    def stamp(self, ident, content):
        """The date this row last changed. Records today only when the content really moved."""
        self.seen.add(ident)
        h = hashlib.sha1(str(content).encode('utf-8')).hexdigest()[:16]
        row = self.d['rows'].get(ident)
        if row is None:
            self.d['rows'][ident] = {'hash': h, 'changed': self.today, 'first': self.today}
            return self.today + '  (new)'
        if row['hash'] != h:
            row['hash'] = h
            row['changed'] = self.today
        return row['changed']

    def gone(self):
        """Identifiers the ledger knows that this build did not produce — they have left the app."""
        return sorted(k for k in self.d['rows'] if k not in self.seen
                      and not self.d['rows'][k].get('decommissioned'))

    def retire(self, ident):
        r = self.d['rows'].get(ident)
        if r is not None and not r.get('decommissioned'):
            r['decommissioned'] = self.today

    def save(self):
        for k in self.gone():
            self.retire(k)
        json.dump(self.d, open(LEDGER, 'w'), indent=0, sort_keys=True)

    def state(self, ident, superseded_by=''):
        """ACTIVE, SUPERSEDED BY …, or DECOMMISSIONED — never blank."""
        if superseded_by:
            return ('SUPERSEDED BY %s — the same figure under another identifier. This number is '
                    'retired and is never handed to anything else.' % superseded_by)
        r = self.d['rows'].get(ident) or {}
        if r.get('decommissioned'):
            return ('DECOMMISSIONED %s — it was here and is not any more. Kept so the number is '
                    'never reused and earlier work can still be traced.' % r['decommissioned'])
        return 'ACTIVE'
