# Onboarding Flow Review — Tier 3 (2026-06-10)

Tier 1 proved every flow is structurally sound (851,903 flows × 26 mechanical rules); Tier 2
judged each of the 50 screens in isolation. Tier 3 judges **flows as narratives**: does each one
read like a coherent conversation, and does it deliver its goal's promise by the recap?

Method: generated the real step sequences (buildSteps is pure) for a covering sample of ~50 flows —
every persona × every single goal with typical income sources, the maximal all-goals flow per
persona, plus interaction cases (both retirement tracks, invest+decumulation dedup, partner-only,
no-sources-yet, all-sources, retired legacy) — and read each as the user would experience it.

## Verdicts

**Strong narratives (no change needed):**
- Every income flow: source picker → one focused screen per source → taxes → "here's what you
  actually have to work with" recap. The recap is the aha moment and it lands.
- Spend flows: estimate → itemize → savings plan → full-year recap with the donut. Coherent arc.
- Retirement decumulation: birth → pool → income → spending → horizon → "will it last?" recap
  directly answers the user's chosen goal ("Make my money last").
- Invest + decumulation dedup: portfolio total pulled from the savings question, recap still
  shows it — the deduplication is invisible to the user, exactly right.
- Net-worth/property hand-off: honest one-screen pointer, no fake data entry.
- All-goals maximal flows: long (29–37 questions) but the user chose everything; section
  progress ("Income · 3 of 7") and skippable optionals carry it.

**Findings — all FIXED in this pass:**
1. **Debt had no payoff moment.** The only substantive goal that ended without a recap — the
   promise is "a plan to clear what you owe" and no plan was shown. → New `recap_debt`:
   debt-free DATE, total interest, interest-only warning, pointer to avalanche/snowball in-app.
   (Recaps don't count against the question budget — flow length unchanged.)
2. **"Who earns this income — you / partner / both?" was asked before "Do you manage money with
   a partner?"** Household context now comes first: partner/family flows open with
   hasPartner / dependentsCount immediately after the profile, then income.
3. **Both-retirement-tracks flows recapped too early** — the retirement recap fired after the
   accumulation questions, then four decumulation questions trailed with no payoff. The shared
   recap now waits for the second track; a new audit rule (recap_retire after ALL its questions)
   locks this across all 851k flows.
4. **Dividends/rental double-count risk** — picking the investment-income or rental source AND
   seeing "Dividends / rental / other" inside retirement income invited entering it twice. The
   row now relabels itself and says where the money is already asked.
5. **Birth screen never said why** it interrupts the income story. Sub now explains: age drives
   401(k) catch-up limits, Social Security timing, and required-withdrawal ages.
6. **Legacy-only flow was a dead end** — one number, no connection to the estate tools that
   exist. The screen now points at Goals & Debt → Estate.

**Noted, deliberately NOT changed (design calls):**
- **Student retirement-accumulation flows include the retirement lifestyle optionals**
  (location/travel/medical/spend-later). All skippable, but pure noise at 19. Tied to the
  deferred Gen-Z framing work (roadmap Phase 2) — recommend stage-gating these four to
  non-students when that lands.
- **Summary shows "Net Worth — unlock next" right after a networth-only flow** told the user to
  set it up in the Net Worth tab. Technically consistent (it activates when accounts exist) but
  could read as "it didn't take." Candidate: a "chosen — set up in app" badge state.
- **Account creation at step 3** (before any value is shown) — flagged in Tier 2, still the
  biggest conversion question in the flow. Test moving it after the income recap in Tier 4 /
  TestFlight rather than guessing.

## Bottom line ("would I use it?")
Reading these fifty conversations end-to-end: yes — the flows ask only what the chosen goals
need, in an order that now reads naturally, with an honest payoff at the end of every section.
The remaining risk is feel, not structure — keyboard behavior, scroll length on dense screens,
the new invite/join path — which is exactly what Tier 4's live simulator walkthroughs cover.
