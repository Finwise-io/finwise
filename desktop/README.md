# MoneyKeel Desktop — one folder, one workstream

Everything desktop lives here, to keep it clean:

- `docs/` — the master PRD (derived from the app PRD, SAME/DIFFERENT per row), the UX design file,
  the living audit/findings/decisions file, and the phased plan.
- `mockups/` — every desktop mock, mock-first, never overwritten (supersede with vN files).
- `platform/` — the web shims (react-native-web plus the pieces it omits). Wired via metro.config.js.

THE ONE-BRAIN RULE: the desktop app has NO code of its own beyond shims and (later) desktop layouts.
Every engine, the store, and the navigation map live in `../src/` and are shared with the phone —
same numbers on every device, provably, via the same agreement tests.
