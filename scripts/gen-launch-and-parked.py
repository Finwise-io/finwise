# Generates docs/finwise-launch-and-parked.xlsx — ONE workbook for prioritization.
#   Tab 1 "Launch Checklist" : everything remaining to ship v1 (blockers + recommended).
#   Tab 2 "Parked / Backlog"  : every consciously-deferred item, deduplicated across all docs.
# Each tab has a blank "Your rank" + "Decision" column to fill in during review.
# Statuses reconciled against code/records where the source docs were stale (noted inline).
# Usage:  .venv/bin/python scripts/gen-launch-and-parked.py
import shutil
import xlsxwriter

OUT  = "/Users/palakjain/Vibe_Coding/finwise/docs/finwise-launch-and-parked.xlsx"
SNAP = "/Users/palakjain/Vibe_Coding/finwise/docs/snapshots/finwise-launch-and-parked-2026-06-26.xlsx"

wb = xlsxwriter.Workbook(OUT, {"in_memory": True})

HDR = wb.add_format({"bold": True, "font_color": "white", "bg_color": "#1F4E5F",
                     "border": 1, "border_color": "#CCCCCC", "valign": "vcenter",
                     "text_wrap": True, "font_size": 11})
TITLE = wb.add_format({"bold": True, "font_size": 13, "font_color": "#1F4E5F"})
NOTE  = wb.add_format({"italic": True, "font_size": 10, "font_color": "#555555", "text_wrap": True, "valign": "top"})

def cell_fmt(bg=None, bold=False):
    d = {"border": 1, "border_color": "#DDDDDD", "valign": "top", "text_wrap": True, "font_size": 10}
    if bg: d["bg_color"] = bg
    if bold: d["bold"] = True
    return wb.add_format(d)
BASE = cell_fmt()
RANK = cell_fmt("#FFF2CC")  # the empty "Your rank" / "Decision" columns — pale yellow = fill me in
STATUS_BG = {
    "blocker": "#F8CBCB", "open": "#FCE5CD", "done": "#D9EAD3",
    "partial": "#FFF2CC", "verify": "#D0E0E3", "decision": "#E6D7F2",
}
STATUS_FMT = {k: cell_fmt(v) for k, v in STATUS_BG.items()}

def status_key(s):
    s = (s or "").lower()
    if "blocked on build" in s or "blocked" in s: return "open"
    if "blocker" in s and "done" not in s: return "blocker"
    if "verify" in s or "likely done" in s: return "verify"
    if "decision" in s or "decide" in s: return "decision"
    if "partial" in s: return "partial"
    if "done" in s or "shipped" in s or "wired" in s: return "done"
    if "open" in s: return "open"
    return None

def sheet(name, intro, headers, rows, widths, status_col, rank_cols, tab_color):
    ws = wb.add_worksheet(name)
    ws.set_tab_color(tab_color)
    # intro block (rows 0-1), header on row 3, data from row 4
    ws.merge_range(0, 0, 0, len(headers) - 1, name, TITLE)
    ws.merge_range(1, 0, 2, len(headers) - 1, intro, NOTE)
    ws.set_row(1, 30)
    HROW = 3
    ws.freeze_panes(HROW + 1, 0)
    for c, (h, w) in enumerate(zip(headers, widths)):
        ws.set_column(c, c, w)
        ws.write(HROW, c, h, HDR)
    ws.set_row(HROW, 28)
    for r, row in enumerate(rows, HROW + 1):
        for c, val in enumerate(row):
            fmt = BASE
            if c in rank_cols:
                fmt = RANK
            elif status_col is not None and c == status_col:
                k = status_key(val)
                if k: fmt = STATUS_FMT[k]
            ws.write(r, c, val if val is not None else "", fmt)
    ws.autofilter(HROW, 0, HROW + len(rows), len(headers) - 1)

# ============================ TAB 1 — LAUNCH CHECKLIST ============================
# Owner: You = account/legal/manual · Claude = in-repo.  Type: Blocker / Recommended / Optional.
# Status reconciled 2026-06-26: rules ARE deployed (doc stale); build #35 blocked on EAS quota.
L_HEADERS = ["ID", "Phase", "Item", "Owner", "Type", "Status (2026-06-26)", "Your rank", "Decision", "Notes / next step"]
L = [
 ["L-1","1.1","Swap market data to a LICENSED vendor (Tiingo / EODHD / AlphaVantage / TwelveData) — replace the unlicensed Yahoo endpoint","You→Claude","Blocker","OPEN — the long pole","","","You pick a vendor + API key (~$10–50/mo EOD); then a ~1-file PriceProvider swap in marketData.ts. Legal blocker."],
 ["L-2","1.2","Deploy Firestore security rules","You","Blocker","DONE 2026-06-17 (checklist doc is STALE)","","","Deployed to finwise-app-jj with the privilege-escalation fix + emulator tests. Verify active in console."],
 ["L-3","1.3","Cut production build #35 + verify OCR + keychain on a real device","You (EAS)","Blocker","BLOCKED on EAS free quota (~Jul 1); code READY","","","739 tests green, tsc clean, T22 loop fix in. Push-button once quota resets. eas build --local fails (macOS-26 keychain)."],
 ["L-4","2","App Store screenshots — 6.9in iPhone, on a REAL device (ML Kit blocks the Simulator)","You","Blocker","OPEN (needs a device build)","","","8 frames + captions + per-persona setup spec'd in finwise-appstore-listing.md."],
 ["L-5","2","Description / keywords / subtitle / promo text","You","Blocker","DRAFTED — needs entry","","","Copy ready in finwise-appstore-listing.md; paste into App Store Connect."],
 ["L-6","2","Category (Finance) + Age rating (4+)","You","Blocker","OPEN (trivial)","","","Questionnaires in ASC."],
 ["L-7","2","Privacy Policy URL + Support URL","You","Blocker","PARTIAL — privacy hosted, needs RE-host of updated copy (see L-11); Support URL TBD","","","finwise-legal is live; B-L1 changed the privacy copy so it must be re-hosted."],
 ["L-8","2.5","App Privacy 'nutrition label' must MATCH the privacy manifest","You","Blocker","OPEN","","","Declare Email, Name, Financial Info, Crash/Diagnostics — all 'app functionality', none 'tracking'. Apple cross-checks."],
 ["L-9","2.5","Reviewer demo login (real account + sample data) in the submission notes","You","Blocker","OPEN","","","Without it the reviewer can't pass the login screen → auto-reject."],
 ["L-10","2.5","Test Delete-account end-to-end on a PRODUCTION build","You","Blocker","OPEN (needs build #35)","","","Guideline 5.1.1(v). Confirm it wipes cloud data + auth."],
 ["L-11","2.6","B-L1 — Re-host the updated privacy/index.html (AI/privacy claim reconciled in code)","You","Blocker","Code DONE (945f929); RE-HOST pending","","","On-device-only tips + ML-Kit OCR; no financial data/receipts leave the device. Live URL must serve the new copy."],
 ["L-12","2.6","B-L2 — Verify a Sentry event lands on the next production build","You","Blocker","WIRED (2026-06-23); VERIFY on build","","","SDK + DSN + plugin + source-maps all set. Fire the Settings test event and confirm it lands."],
 ["L-13","2.6","B-L3 — Disclaimer on every projection / 'on-track' verdict","Claude","Important","DONE (bb68bad)","","","Shared <Disclaimer/> on all judgment screens; coverage guard test."],
 ["L-14","2.6","B-L4 — Graceful network degradation","Claude","Important","DONE (verified, no code change)","","","allSettled + cache fallback; proven by marketData/economicData/store_prices offline tests."],
 ["L-15","2.6","A-1 — One income base (take-home) drives every %-of-income spending category","Claude","Accuracy P0","LIKELY DONE on taxonomy-v1.0.7 — VERIFY","","","take_home_agreement.test + number_agreement.test pass. Confirm the % path specifically."],
 ["L-16","2.6","A-2 — Cross-screen money-agreement matrix + tests","Claude","Accuracy P0","DONE — agreement matrix shipped 2026-06-25","","","number_agreement.test.ts green. A wrong number = lost trust (L-7)."],
 ["L-17","2.6","Verify the bug ledger has no open user-facing money error","Claude","Important","Ongoing — ledger shows 0 open","","","Re-confirm before each submit."],
 ["L-18","2.6","Run the Maestro flows on a real device (auth-signup, smoke, b21-add-sheet, nw-donut, cashflow)","You","Important","OPEN (needs build)","","","Selectors have never executed on-device (ML Kit blocks the simulator)."],
 ["L-19","2.6","Prep the App Review note (educational planning tool; no money movement / linking / securities advice)","You","Important","DRAFT exists (finwise-app-review-notes.md)","","","De-risks the fintech-licensing guideline."],
 ["L-20","2.6","Decide: scope the launch US-only","You","Positioning","DECISION — likely already (USD-only, picker removed)","","","Confirm; don't market global. GLBA/state-privacy posture assumes US."],
 ["L-21","2.6","Decide: track onboarding completion as the #1 launch metric","You","Positioning","DECISION","","","Needs basic analytics (see Parked P-73)."],
 ["L-22","4","Clean onboarding per persona (student / variable-income / professional / retiree) — numbers reconcile","You","Blocker","OPEN (needs build #35)","","","Use finwise-user-guide.md as the script."],
 ["L-23","4","Confirm prices load from the LICENSED provider (not Yahoo)","You","Blocker","Depends on L-1","","",""],
 ["L-24","4","Sign up → log out → recover account → log back in","You","Blocker","OPEN","","",""],
 ["L-25","4","Physical-device test (gestures, keyboard, safe-area, large text)","You","Recommended","OPEN (needs build)","","",""],
 ["L-26","4","eas submit --platform ios --profile production → TestFlight → submit for review","You","Blocker","Final step","","","eas submit is separate from the build quota."],
]
sheet("Launch Checklist",
      "Everything left to ship v1, by phase. 'Type' = Blocker (can't ship without) / Recommended / Optional. "
      "Owner: You = account/legal/manual · Claude = in-repo. Statuses reconciled against code/records on 2026-06-26 "
      "(a few launch-checklist.md rows were stale — e.g. Firestore rules ARE deployed). Fill the yellow 'Your rank' "
      "+ 'Decision' columns to set the order we work them. Rows marked 'VERIFY' are doc/memory-derived — confirm in code before relying.",
      L_HEADERS, L, [6, 7, 52, 10, 12, 30, 9, 12, 50], status_col=5, rank_cols={6, 7}, tab_color="#C00000")

# ============================ TAB 2 — PARKED / BACKLOG ============================
P_HEADERS = ["ID", "Category", "Item", "Status", "Source doc(s)", "Your rank", "Decision", "Why parked / notes"]
# Status: Open / Partial / Done-verify / Decision.  "Done-verify" = doc says open but code/memory says shipped — verify & drop.
P = [
 # --- Data / Integrations ---
 ["P-1","Data/Integrations","Plaid / bank & brokerage linking (account aggregation)","Open","features, roadmap, scorecard, microservices","","","Auto-pull balances/transactions behind an aggregator interface. XL effort, server-side (Cloud Functions). Biggest stickiness/friction lever."],
 ["P-2","Data/Integrations","Auto-derive dividends from ticker (Yahoo yield/events)","Open","features","","","Auto-populate dividends instead of manual entry."],
 ["P-3","Data/Integrations","Ticker autocomplete + price-cache TTL","Open","features","","","Perf v2 polish; attribution/allocation/trend already shipped."],
 ["P-4","Data/Integrations","Receipt OCR native rebuild (activate ML Kit) + tune parsing","Open","features, roadmap","","","npx expo run:ios native rebuild, then test a real scan. Launch-adjacent — folds into build #35."],
 ["P-5","Data/Integrations","CSV import validation (format / length / dup / row-cap)","Open","qa-plan (QA-T2-009)","","","Import has no malformed-row rejection / bounds today. P1."],
 # --- Insights / AI ---
 ["P-6","Insights/AI","History-driven insight engine + notifications (richer than today's 9 rules)","Partial","roadmap 1.5, scorecard","","","9-rule ranked engine shipped; the snapshot-history version ('gas +15%, stocks -12%') powering nudges is parked."],
 ["P-7","Insights/AI","AI 'show your work' — consistent tappable explainer everywhere","Open","ui-compliance (G-27)","","","Explainability strong inline but not a uniform affordance. P2."],
 ["P-8","Insights/AI","Planning copilot — LLM Q&A over your data ('can I afford a $600k house?')","Open","roadmap Ph4","","","Differentiation."],
 ["P-9","Insights/AI","Life-event scenarios (home, child, job change, sabbatical) side-by-side","Open","roadmap Ph4","","",""],
 # --- Retirement / Modeling ---
 ["P-10","Retirement/Modeling","Drawdown / decumulation 'will it last?' view for retirees — deeper surfaces","Partial","features, roadmap, microservices","","","Accumulation done; a drawdown view shipped for the 50yo review; deeper retiree framing open."],
 ["P-11","Retirement/Modeling","Tax-aware drawdown (withdrawal order, cap-gains harvesting, Roth conversions, healthcare/LTC)","Open","features, roadmap, microservices","","","RMDs/order partly shown as transparency; deeper tax-awareness parked (sensitive engine)."],
 ["P-12","Retirement/Modeling","Salary-growth assumption (contributions rise with raises)","Open","features, roadmap, microservices","","",""],
 ["P-13","Retirement/Modeling","Filing status (married/HoH) + multi-country tax & account-type 'packs'","Open","roadmap, scorecard","","","Single-filer US-2026 only today. TaxPack / AccountTypePack abstraction (UK/CA/AU/IN). Tied to global expansion."],
 ["P-14","Retirement/Modeling","Couples / household + shared goals (joint + individual views)","Open","roadmap Ph2.5","","","Partner invite partial. Distinct from the encryption key-sharing item (P-21)."],
 ["P-15","Retirement/Modeling","529 college planning","Open","features","","","Life-stage gap."],
 ["P-16","Retirement/Modeling","Life / long-term-care insurance planning","Open","features","","","Life-stage gap."],
 ["P-17","Retirement/Modeling","Estate / legacy planning (beneficiaries, estate docs)","Open","features, onboarding-matrix","","","Legacy/beneficiary fields deferred from onboarding S7."],
 ["P-18","Retirement/Modeling","Unemployed / transition mode (runway, COBRA, survival budget)","Open","roadmap Ph2.3","","","Overlaps the runway insight (P-34)."],
 ["P-19","Retirement/Modeling","Gig / partially-employed mode (variable-income smoothing, 1099 tax set-aside)","Open","roadmap Ph2.4","","","Pay-yourself-a-salary, irregular cadences, tax reserve."],
 # --- Onboarding ---
 ["P-20","Onboarding","'Sharpen your plan' progressive surface for deferred onboarding fields","Partial","onboarding-matrix, features","","","Checklist version shipped; the progressive 'add more to sharpen' surface (retirement COL, travel/medical budget, allocation, employer match, beneficiaries, risk tolerance, per-goal priority…) is spec'd separately."],
 # --- Security / Privacy ---
 ["P-21","Security/Privacy","Household/partner sharing under zero-knowledge encryption (key-wrapping via invite code)","Open","features","","","Two passwords can't share one key today; fails safe (no crash)."],
 ["P-22","Security/Privacy","Multi-factor authentication (MFA)","Open","features, qa-plan","","","App-lock + inactivity timeout already shipped; MFA is the remaining auth-hardening item."],
 ["P-23","Security/Privacy","Dependency vuln scan (npm audit + Snyk in CI) — triage ~58 advisories","Open","features, qa-plan (T2-005/003)","","","Mostly build-time tooling. Add npm audit --audit-level=high + gitleaks to CI."],
 ["P-24","Security/Privacy","SAST / static analysis (SonarQube / Semgrep) in CI","Open","qa-plan (T2-006)","","","P1."],
 ["P-25","Security/Privacy","Mobile binary scan (MobSF on the EAS build)","Open","qa-plan (T2-007)","","","Insecure-storage/transport scan. P1."],
 ["P-26","Security/Privacy","Transport security hardening (HTTPS-only, cert/timeout handling)","Open","qa-plan (T2-010)","","","Enforce HTTPS on Yahoo/BLS/Treasury fetches. P1."],
 ["P-27","Security/Privacy","Slide-to-confirm / biometric on the heaviest actions (per-action)","Open","ui-compliance (G-15)","","","App-lock biometric shipped; per-action confirm is the gap. P1."],
 # --- Accessibility ---
 ["P-28","A11y","Screen-reader labels (VoiceOver/TalkBack) on the remaining ~26 screens","Open","features, qa-plan, ui-compliance (G-13)","","","Started on shared controls. Single biggest a11y gap. P0."],
 ["P-29","A11y","44x44 touch targets (grow elements, not just hitSlop)","Open","qa-plan, ui-compliance (G-14)","","","Many targets sub-44 via hitSlop. P0."],
 ["P-30","A11y","Dark + high-contrast themes (token swap)","Open","features, qa-plan, ui-compliance (G-21)","","","Light-only today. P2."],
 ["P-31","A11y","WCAG AA contrast audit (text + data viz)","Open","qa-plan, ui-compliance (G-32)","","","Not formally audited. P1/P2."],
 ["P-32","A11y","Reduce-motion-aware micro-interactions","Open","ui-compliance (G-23)","","","P3."],
 # --- UI / UX ---
 ["P-33","UI/UX","Privacy-blur / hide-balances toggle","Done-verify","features, qa-plan, ui-compliance (G-16)","","","features.md says a 'hide-balances mask-ALL' shipped in build #34 — VERIFY in code; likely closable."],
 ["P-34","UI/UX","Runway / emergency-fund insight ('cash covers N months')","Open","features, roadmap","","","Needs a liquid-cash balance. Overlaps unemployed mode (P-18)."],
 ["P-35","UI/UX","Net-worth-over-time card on Home (trend from snapshots)","Open","features","","","'Net worth up $40k over 6 months.'"],
 ["P-36","UI/UX","Header + bottom tab-bar redesign","Partial","features","","","Greeting/streak/avatar header + nav still older styling."],
 ["P-37","UI/UX","Legacy detail-screen redesigns behind nav (Budget/Transactions, Settings, Tips, Rewards)","Open","features, roadmap, scorecard","","","Cockpit tiles route to not-yet-redesigned screens."],
 ["P-38","UI/UX","Single-total vs category-breakdown spend reconciliation (one source of truth)","Open","features","","","Avoid double-counting in recaps vs budget."],
 ["P-39","UI/UX","Skeleton loaders + offline/sync state matrix","Open","ui-compliance (G-25)","","","No skeletons / stale states. P1."],
 ["P-40","UI/UX","App-wide offline / sync indicator banner","Open","ui-compliance (G-20), qa-plan","","","Partial offline handling (tips) but no global status. P2."],
 ["P-41","UI/UX","Undo toasts for reversible deletes ('Deleted · Undo')","Open","ui-compliance (G-11b)","","","Destructive actions use blocking dialogs. P1."],
 ["P-42","UI/UX","Reusable 'what's this?' tooltip + searchable glossary module","Partial","ui-compliance (G-17), microservices","","","Build-#34 added glossary InfoDots; the reusable tooltip/glossary module + deep-links may still be partial — verify scope. P2."],
 ["P-43","UI/UX","Money/date formatting standard (fix cents drift)","Open","ui-compliance (G-26 / B-46)","","","No written standard; cents-vs-whole-dollar drift. P2."],
 ["P-44","UI/UX","User-pinnable / reorderable Home cards","Open","ui-compliance (G-18)","","","Home adapts by persona but users can't pin/reorder. P2."],
 ["P-45","UI/UX","Raw-data / table toggle on charts","Open","ui-compliance (G-19)","","","Cognitive-load + a11y miss. P2."],
 ["P-46","UI/UX","Notification design system (caps, per-type controls, deep-link)","Open","ui-compliance (G-30)","","","Push configured but no frequency caps. P2."],
 ["P-47","UI/UX","Permission priming (camera/notifications) before the OS prompt","Open","ui-compliance (G-29)","","","P2."],
 ["P-48","UI/UX","Surface the encryption cue in the UI (lock / 'encrypted' line)","Open","ui-compliance (G-34)","","","Encryption real but not shown. P3."],
 ["P-49","UI/UX","Form-validation timing consistency (on-blur / submit)","Open","ui-compliance (G-35)","","","P3."],
 ["P-50","UI/UX","Named text styles (Title/Body/Caption) + line-heights","Open","ui-compliance (G-22)","","","Applied ad-hoc, no roles. P3."],
 ["P-51","UI/UX","Thumb-zone / Larger-text layout audit","Open","ui-compliance (G-33), qa-plan","","","P3."],
 # --- Stickiness / Growth ---
 ["P-52","Stickiness/Growth","Push notifications (reminders / nudges)","Open","features","","","Plugin configured; reminder logic not built ('near your dining budget')."],
 ["P-53","Stickiness/Growth","Savings-goals full UI (waterfall-backed: progress, priority, projections)","Partial","features, roadmap, scorecard","","","Goals tab + funding engine exist (B-71); finish the waterfall-backed screen."],
 ["P-54","Stickiness/Growth","Gen-Z motivational framing + app-wide Simple Mode","Open","features, roadmap Ph2.1/2.5","","","Start-now compounding framing; Retirement got only a local plain toggle."],
 ["P-55","Stickiness/Growth","Deeper gamification + education micro-lessons + shareable wins","Open","roadmap Ph2.5","","","Milestones/challenges/streak rewards."],
 ["P-56","Stickiness/Growth","Trends & Year-in-Review + shareable reports + widgets + weekly digest","Open","roadmap Ph4","","","Surface snapshot history as value."],
 # --- Tech-debt / QA ---
 ["P-57","Tech-debt/QA","Full string internationalization (translate copy, not just numbers)","Open","features, roadmap, scorecard","","","Externalize UI strings (i18next), date/number-by-locale, RTL. USD formatter already shipped."],
 ["P-58","Tech-debt/QA","Currency/locale formatting — on-device verification","Partial","features","","","Model + formatter wired on active screens; on-device verify pending."],
 ["P-59","Tech-debt/QA","Sentry full wiring","Done-verify","features, qa-plan","","","MEMORY + launch B-L2 say FULLY WIRED 2026-06-23 — VERIFY & drop (only the on-build verify remains, = L-12)."],
 ["P-60","Tech-debt/QA","Data export (JSON/CSV) — user data-right + round-trip import","Open","qa-plan, ui-compliance (G-28), roadmap 0.4","","","Delete-all exists; no export. P2."],
 ["P-61","Tech-debt/QA","Schema versioning + migrations on store hydrate","Open","roadmap Ph0.4","","","Safe upgrades as fields keep being added."],
 ["P-62","Tech-debt/QA","Unit tests for untested core calcs (Monte-Carlo, corpus, asset returns, grossFromNet…)","Open","qa-plan (T1-030..036)","","","simulate(), capitalNeeded(), solveRetireAge(), blendedReturn, investableValue… lack dedicated tests. P0/P1."],
 ["P-63","Tech-debt/QA","Service-layer error-handling audit (try-catch + typed fallback)","Open","qa-plan (T4-002)","","","Verify BLS/Treasury/OCR/Firebase fetches aren't happy-path-only. P0."],
 ["P-64","Tech-debt/QA","Network timeout / retry on all external calls","Open","qa-plan (T4-003)","","","No infinite spinner; every call needs a timeout + offline fallback. P1."],
 ["P-65","Tech-debt/QA","Deprecated-API sweep (e.g. Swipeable → ReanimatedSwipeable)","Open","qa-plan (T4-001)","","","Migrate deprecated gesture-handler/date/expo APIs. P1."],
 ["P-66","Tech-debt/QA","Complexity-hotspot review (retirement cockpit, income grid)","Open","qa-plan (T4-004)","","","Flag deeply nested logic for refactor. P2."],
 ["P-67","Tech-debt/QA","Dead/orphan code + legacy 'debts' array (B-42) cleanup","Open","qa-plan (T4-005), bug-ledger","","","Unused exports, @deprecated scaffolding. Remove B-42 post-launch once no legacy data. P2."],
 ["P-68","Tech-debt/QA","Type-safety escapes ('as any' casts, store typing) audit","Open","qa-plan (T4-006)","","","P2."],
 ["P-69","Tech-debt/QA","Coverage gate on src/domain (e.g. 80%) in CI","Open","qa-plan §5.2","","",""],
 ["P-70","Tech-debt/QA","Adopt the design-review governance gate as a merge check","Open","ui-compliance (G-36)","","","Tokens/components centralized; the gate is written but not enforced."],
 # --- Branding ---
 ["P-71","Branding","App rename / trademark resolution ('FinWise' may be trademarked)","Open","rename-candidates, README","","","REAL legal blocker before public launch. Front-runner 'Hatcho' (hatcho.io/.ai free, clean open-web TM). Next: pick 2-3, run USPTO TESS (classes 9/36/42), register domains, rename across app."],
 # --- Other ---
 ["P-72","Other","Performance / offline-first architecture (cross-cutting)","Open","roadmap","","",""],
 ["P-73","Other","Analytics / telemetry (activation funnels, D1/D7/D30 retention)","Open","roadmap Ph0.6","","","Needed to know if we're 'top-3'. Enables launch metric L-21."],
 ["P-74","Other","Device-cloud E2E (Maestro on BrowserStack/Sauce for fragmentation)","Open","qa-plan §5.1","","","Broader device-matrix coverage beyond the launch-checklist Maestro flows (L-18)."],
]
sheet("Parked - Backlog",
      "Every consciously-deferred item, deduplicated across all docs (features, roadmap, qa-plan, ui-compliance, "
      "scorecard, microservices, onboarding-matrix, rename-candidates). Status: Open / Partial / Done-verify "
      "(doc says open but code/memory says shipped — verify & drop) / Decision. Fill the yellow 'Your rank' + "
      "'Decision' (do-now / next / later / drop) columns. Source = which doc(s) it came from.",
      P_HEADERS, P, [6, 16, 50, 11, 26, 9, 11, 56], status_col=3, rank_cols={5, 6}, tab_color="#1F4E5F")

wb.close()
shutil.copyfile(OUT, SNAP)
print("wrote", OUT)
print("snapshot", SNAP)
print("launch rows:", len(L), "| parked rows:", len(P))
