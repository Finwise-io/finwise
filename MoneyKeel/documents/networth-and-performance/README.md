# documents/networth-and-performance

**Lives here:** Net worth, holdings, the ledger of money movements, returns and performance.

**Never here:** Code of any kind.

Naming and structure: `MoneyKeel/documents/standards/moneykeel_naming_spec_file-and-folder-naming_v01.md`

**Which design each screen was built from, by build:** `MoneyKeel/documents/standards/moneykeel_pres_spec_design-each-screen-was-built-from_v01.md`. The Build 53 Net worth and Performance finals sit in this folder's `archive/` by mistake (the 2026-09-01 move); they are still the designs the app is built from.

## Mocks
- `moneykeel_pres_mock_net-worth-quiet-instrument_v08.html` — **THE CURRENT NET WORTH DESIGN** (approved 2026-09-14: "approved"): the Build 53 screen plus the three ways to add an account and every ruling to date. Every Net worth task starts here. v01–v07 of the series are in `archive/` (v06 is the record of Build 53). Once approved, it is the design every Net worth task starts from, and v06 moves to `archive/`.
- `moneykeel_pres_mock_debt-editor_v03.html` — the debt editor, every state (A–H), drawn from the build 2026-10-31; no approval on record (he judges it on TestFlight, DEC-9228). v01, approved 2026-07-31 (DEC-0020), is `MoneyKeel/documents/other/archive/2026-07-31_moneykeel_pres_mock_debt-editor_v01.html`; v02 is in `archive/`.
- `moneykeel_pres_mock_step-by-step-add_v02.html` — Net worth’s step-by-step add, its ＋ Add sheet and the Edit account sheet (A–P), drawn from the build 2026-10-31; no approval on record. v01 is in `archive/`.
- `moneykeel_pres_mock_add-account-edit-mode_v02.html` — Add an account opened on a saved account (A–E), drawn from the build 2026-10-31; no approval on record. v01 is in `archive/`.
  All three are held line by line and box by box — words, sizes, weights, colours, and what each box holds — by `src/screens/__tests__/drawn_from_build_nw_2026_10_27.test.tsx`; run it with FXNW_DRAW_OUT=<folder> to write each state again from the build.
- **Phase 3 of the master-record plan, drawn 2026-11-12, NOT APPROVED (waits on his TestFlight review, DEC-9228).** Until each is approved, the version before it stays in place as the design the build is held to, and moves to `archive/` the day the new one is approved (the Net worth v08 precedent):
  - `moneykeel_pres_mock_account-page_v02.html` — the account page: an account's questions asked in place (V2 with his re-saved Robinhood file), the value's own date ("as of"), "Price from …" on a stale price, holdings with a question waiting. v01 stays the build's design.
  - `moneykeel_pres_mock_holding-detail_v03.html` — the Holding page: E1, E2, L1, L2, S1, X1 and his C1 sentence, each with the page after the answer. v02 stays the build's design.
  - `moneykeel_pres_mock_performance_v18.html` — the Performance tab, frame 1: the day the accounts' value is from. v17 stays the build's design.
  - `moneykeel_pres_mock_add-account-by-hand_v03.html` — a balance left empty is not entered, never $0. v02 stays the build's design.
- `moneykeel_pres_mock_empty-state-pattern_v01.html` — the empty-state pattern, approved 2026-09-12.
