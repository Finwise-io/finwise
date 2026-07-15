# FCC state contract — empty · stale · hidden · loading

**Status: BINDING.** Every FCC screen obeys these four rules. Each rule names the ONE helper that
implements it and the test that pins it — a new screen that violates a rule should fail a test,
not a review. (Detailed design v1.1, Invest sheet "Empty/stale/hidden/loading state contract".)

## 1 · EMPTY — never a fake zero, always a door in
A screen with no data explains what it needs in plain words and offers the real way in
(connect / import / add by hand / finish setup). It never renders a dashboard of $0s, a demo
chart, or a guessed number.
- Home: the doors until real money data exists from ANY source (profile ≠ data).
  Pinned: `first_run_lens.test.tsx` ("still shows the three doors"), `ui_tester_flows` FLOW 1.
- Roth / Required-withdrawals with no pre-tax accounts: three plain sentences + the road to
  Net worth — no fake dial. Pinned: `plan_fcc.test.tsx`.
- Bill calendar before setup: the explain-and-finish gate. In-code (BillCalendarScreen).
- Invest with nothing priced: add-a-holding invite; bonds-only users still get the grouped
  list. Pinned: `invest_fcc.test.tsx`.
- The will-it-last tease is a SAMPLE, labeled first ("Sample: 84%"), never computed from the
  user, spoken as "not your number". Pinned: `first_run_lens.test.tsx`.

## 2 · STALE — a number always carries its age once it can age
Three staleness clocks, one rule each — the label travels WITH the number everywhere it shows:
- **Live prices** — `priceFreshness` (src/services/marketData.ts): "updated 2h ago" → warning
  wording when stale. Same string on Invest main, holding detail, Home hero.
- **Manual values** — `valueFreshness` (src/domain/assets): value-as-of date shown; nudge at
  6 months ("⏱ value N months old"). Every manual save re-stamps `value_as_of` (add-account,
  bond/alt editors — one staleness concept). Pinned: `invest_fcc.test.tsx`, `connect_fcc.test.tsx`.
- **Connections** — `connectionFreshness` (src/services/sync): stale after 3 days; Home says
  "Balances from Chase are 9 days old" in words. Pinned: `connect_fcc.test.tsx`.

## 3 · HIDDEN — zero dollar signs, judgments keep their words
With hide-balances on, every dollar renders as •••• via `maskedMoney`/`maskDollars`
(src/components/useMoney.ts) — `money()` stays pure and is never called for a user-facing
balance. Shares, dates, percentages, and judgment sentences ("you stay above zero") remain.
- Pinned twice: the RUNTIME walk (`fcc_agreement.test.tsx` pin 3 — Home, Cash flow, Plan, Net
  worth render ZERO `$` under hide, both lenses) and the STATIC source scan
  (`hide_balances_mask.test.ts` — no formatter bypass anywhere in src/screens).

## 4 · LOADING — show the last truth with its age, never a spinner over a guess
While anything refreshes, screens keep showing the previous number WITH its freshness label
(rule 2) rather than blanking or animating placeholders. A number that never existed shows the
EMPTY state (rule 1), not a shimmer. Refresh affordances say what they refresh ("Refresh prices").

## The meta-pin
`state_contract.test.ts` asserts the contract's load-bearing helpers exist and behave:
the three staleness clocks' thresholds, the mask walk's coverage list, and the pure-money rule.
Change any of those and the contract test names this document.

## Founder-decided amendments (2026-07-15)
- **Gain text = dark green `#006300`** (`Colors.gainText`) for every gains/losses/change sentence
  (investment gains, net-worth deltas, returns, ledger effects, the surplus hero); brand green
  stays for buttons, marks, and status. Loss red unchanged. Words always carry the sign.
- **Dense-table exception:** reference tables (bill calendar, NW inventory rows, steer buckets)
  may use 12–15pt tabular money below the 17pt floor because every row speaks a full sentence
  to VoiceOver; all other money keeps the floor. Recorded in the UX workbook's Type sheet.
