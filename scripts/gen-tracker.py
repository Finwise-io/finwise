# Regenerates docs/finwise-tracker.xlsx (consolidated bugs + backlog + shipped).
# Uses XlsxWriter (shared-strings output → maximally Excel/Numbers compatible).
# Usage:  python3 -m venv .venv && .venv/bin/pip install XlsxWriter && .venv/bin/python scripts/gen-tracker.py
# Edit the curated backlog (list B) + shipped (list S) here; the Bug Ledger tab auto-parses finwise-bug-ledger.md.
import re
import xlsxwriter

LEDGER = "/Users/palakjain/Vibe_Coding/finwise/docs/finwise-bug-ledger.md"
OUT = "/Users/palakjain/Vibe_Coding/finwise/docs/finwise-tracker.xlsx"

wb = xlsxwriter.Workbook(OUT, {"in_memory": True})

HDR = wb.add_format({"bold": True, "font_color": "white", "bg_color": "#1F4E5F",
                     "border": 1, "border_color": "#CCCCCC", "valign": "vcenter",
                     "text_wrap": True, "font_size": 11})
def cell_fmt(bg=None):
    d = {"border": 1, "border_color": "#DDDDDD", "valign": "top", "text_wrap": True, "font_size": 10}
    if bg: d["bg_color"] = bg
    return wb.add_format(d)
BASE = cell_fmt()
STATUS_BG = {
    "blocker": "#F8CBCB", "done": "#D9EAD3", "partial": "#FCE5CD",
    "next": "#CFE2F3", "later": "#EAEAEA",
}
STATUS_FMT = {k: cell_fmt(v) for k, v in STATUS_BG.items()}

def status_key(s):
    s = (s or "").lower()
    if "blocker" in s: return "blocker"
    if any(k in s for k in ["fixed", "done", "shipped", "resolved"]): return "done"
    if any(k in s for k in ["partial", "in progress", "in-progress"]): return "partial"
    if "next" in s: return "next"
    if any(k in s for k in ["later", "deferred", "by-design", "by design"]): return "later"
    return None

def sheet(name, headers, rows, widths, status_col, tab_color):
    ws = wb.add_worksheet(name)
    ws.set_tab_color(tab_color)
    ws.freeze_panes(1, 0)
    for c, (h, w) in enumerate(zip(headers, widths)):
        ws.set_column(c, c, w)
        ws.write(0, c, h, HDR)
    ws.set_row(0, 28)
    for r, row in enumerate(rows, 1):
        for c, val in enumerate(row):
            fmt = BASE
            if status_col is not None and c == status_col:
                k = status_key(val)
                if k: fmt = STATUS_FMT[k]
            ws.write(r, c, val if val is not None else "", fmt)
    ws.autofilter(0, 0, len(rows), len(headers) - 1)

# ---------- Sheet 1: Open Items & Backlog ----------
B = [
 ["L-1","Launch","Market-data licensing — replace the unofficial Yahoo endpoint with a licensed end-of-day vendor (Tiingo / EODHD / Twelve Data)","Blocker","Open","You + Eng","Pick a vendor + get an API key; then a ~1-file PriceProvider swap in marketData.ts. THE main remaining launch blocker."],
 ["L-2","Launch","App Store listing — screenshots (6.7in/6.5in), description, keywords, category, age rating","Blocker","Open","You","Prepare in App Store Connect."],
 ["L-3","Launch","App Privacy 'nutrition label' must match the privacy manifest (Email, Name, Financial info, Crash data; all app-functionality, no tracking)","Blocker","Open","You","Enter in App Store Connect; Apple cross-checks against the manifest."],
 ["L-4","Launch","Reviewer demo login — a working email+password with sample data in the submission notes","Blocker","Open","You","Without it the reviewer can't get past login -> rejection."],
 ["L-5","Launch","On-device test of new flows (delete account, recovery code, Face ID lock)","Blocker (verify)","In progress","You","TestFlight v1.0.1 build #22 uploaded 2026-06-20 (crypto fix); test once it finishes processing."],
 ["S-1","Security/Privacy","Household / partner sharing under zero-knowledge encryption","Next-up","Open","Eng","Two passwords can't share one key today; fails safe (no crash). Restore via a shared key passed through the invite code (key-wrapping)."],
 ["S-2","Security/Privacy","Multi-factor authentication (MFA)","Later","Open","Eng","App lock + inactivity timeout already shipped; MFA is the remaining auth-hardening item."],
 ["S-3","Security/Privacy","Sentry crash reporting — wire @sentry/react-native properly","Later","Open","Eng","Needs Metro config (getSentryExpoConfig) + Expo plugin + DSN. Global JS error handler already ships crash capture locally."],
 ["S-4","Security/Privacy","Deploy the AI proxy (functions/) + set AI_PROXY_URL — or ship v1 without AI tips","Next-up","Open","You + Eng","Needs the Firebase Blaze plan. App already falls back to on-device tips."],
 ["S-5","Security/Privacy","Dependency audit — triage 58 npm advisories (npm audit --omit=dev)","Later","Open","Eng","Almost all are build-time tooling, not shipped in the app."],
 ["A-1","Accessibility","Per-screen screen-reader labels on the remaining ~26 screens","Next-up","Open","Eng/UI","Shared Button/controls, tab bar, TopBar, Home + new screens already labelled."],
 ["A-2","Accessibility","Dark mode","Later","Open","UI",""],
 ["A-3","Accessibility","Privacy-blur when the app is backgrounded","Later","Open","Eng","Hide financial data in the app switcher."],
 ["A-4","Accessibility","Color-contrast audit (G-32)","Later","Open","UI",""],
 ["F-1","Features","Receipt OCR native rebuild + test (ML Kit)","Next-up","Open","Eng","npx expo run:ios to activate, then test a real receipt."],
 ["F-2","Features","Plaid bank / brokerage linking","Later","Open","Eng","Biggest stickiness lever; manual entry doesn't scale. Needs Plaid keys + a backend."],
 ["F-3","Features","Savings goals — finish the waterfall-backed goals screen UI","Next-up","Open","Eng",""],
 ["F-4","Features","Drawdown deeper tax-awareness (Roth conversions, capital-gains harvesting, catch-up)","Later","Open","Eng","Drawdown v1 shipped (withdrawal order, depletion age, RMDs)."],
 ["F-5","Features","Single-total vs categories spend reconciliation — one source of truth","Next-up","Open","Eng",""],
 ["F-6","Features","Full string internationalization (translate copy, not just numbers)","Later","Open","Eng","Currency picker already reformats numbers."],
 ["F-7","Features","Auto-derive dividends from ticker; ticker autocomplete; price-cache TTL","Later","Open","Eng","Perf v2 polish."],
 ["F-8","Features","Life-stage gaps: 529 college planning, life/LTC insurance, estate/legacy","Later","Open","Eng",""],
 ["F-9","Features","Push notifications (reminders/nudges) — plugin configured, needs APNs + logic","Later","Open","Eng",""],
 ["P-1","Polish","Net-worth-over-time card on Home; runway / emergency-fund insight","Later","Open","UI",""],
 ["P-2","Polish","Header + bottom tab bar redesign; legacy detail-screen redesigns","Later","Open","UI",""],
 ["I-1","Infra","GitHub Pages 'pages build and deployment' workflow keeps failing","Later","Open","You/Eng","Harmless; disable Pages in repo settings or fix the Jekyll build over docs/."],
]
sheet("Open Items & Backlog",
      ["ID","Category","Item","Priority","Status","Owner","Next step / detail"],
      B, [8,16,46,15,13,12,60], status_col=3, tab_color="#C00000")

# ---------- Sheet 2: Bug Ledger (parsed) ----------
bug_rows = []
with open(LEDGER) as f:
    for line in f:
        if re.match(r"\|\s*B-\d+\s*\|", line):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            cells = (cells + [""] * 8)[:8]
            clean = [re.sub(r"[`*]", "", c) for c in cells]
            bug_rows.append([clean[0], clean[1], clean[2], clean[3], clean[6], clean[7]])
bug_rows.sort(key=lambda r: int(re.sub(r"\D", "", r[0]) or 0))
sheet("Bug Ledger (all)",
      ["ID","Severity","Area","Description","Status","Resolution / notes"],
      bug_rows, [8,12,22,60,16,60], status_col=4, tab_color="#1F4E5F")

# ---------- Sheet 3: Shipped ----------
S = [
 ["Zero-knowledge cloud encryption","Security","Shipped","Financial data AES-256 encrypted on-device (password-derived key, never sent) before sync; Firestore stores only ciphertext."],
 ["Recovery code","Security","Shipped","Wrapped-key model; unlocks data after a forgotten-password reset, re-locks under new password. Shown at signup; regenerate in Settings."],
 ["In-app account deletion","Compliance","Shipped","Settings -> Delete account (re-auth -> wipes Firestore + Auth). App Store 5.1.1(v)."],
 ["Biometric app lock","Security","Shipped","Face ID / Touch ID / passcode + 2-min background auto-relock; Settings toggle."],
 ["Apple Privacy Manifest","Compliance","Shipped","ios.privacyManifests — no tracking; data types declared."],
 ["Hardened auth","Security","Shipped","Removed plaintext-password store; anti-enumeration messaging."],
 ["AI provider key moved server-side","Security","Shipped","Anthropic/Vision keys no longer bundled; configurable proxy (functions/aiTips)."],
 ["Accessibility labels (start)","Accessibility","Shipped","Screen-reader labels on shared controls, tab bar, TopBar, Home, back button; 44pt targets."],
 ["Formal QA suite + CI fix","Quality","Shipped","587 tests incl. golden scenarios + precision guards; CI green (Java 21 fix for the rules job)."],
 ["RN secure-random fix","Security","Shipped","react-native-get-random-values polyfill so CryptoJS works on-device (signup crash fix); makes local encryption actually take too."],
 ["B-49 assets-basis divergence","Bug fix","Fixed","All surfaces use resolveNetWorthRows -> one net-worth/nest-egg basis; locked by tests."],
 ["B-52 'savings rate' ambiguity","Bug fix","Fixed","Insight = 'investing % of gross'; Analytics = 'Savings rate (of take-home)' + caption."],
 ["TestFlight build v1.0.1 (#22)","Launch","Done","Built on EAS + auto-submitted to TestFlight 2026-06-20."],
]
sheet("Shipped 2026-06", ["Item","Area","Status","Detail"], S, [40,16,12,72], status_col=2, tab_color="#38761D")

wb.close()
print("wrote", OUT, "| backlog:", len(B), "| bugs:", len(bug_rows), "| shipped:", len(S))
