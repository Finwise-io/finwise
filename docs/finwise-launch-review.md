# FinWise — Independent Launch Review

_Reviewer: Principal Product Leader (finance apps), acting as launch reviewer/approver — **did not build FinWise**._
_Date: 2026-06-23. Method: read the calculation engines, security/data-egress paths, legal surfaces, and the design/QA docs; grounded in current US fintech standards (sources at the end). **Did not run on a device** — the verdict is conditional on the named device items._

---

## Verdict: **Conditional approval — do not ship until the 4 gates clear**

The financial core, the security architecture, and the test rigor are genuinely launch-grade — better than most indie finance apps and competitive with paid planners on the modeling. But there are four issues a finance-app launch cannot pass with, and one is a trust/legal problem hiding behind a marketing claim. None require deep rewrites — days, not weeks. All four are now tracked in `docs/finwise-launch-checklist.md` (Phase 2.6).

---

## What's genuinely strong (credit where due)
- **The retirement engine is real, not theater.** Monte Carlo (~400 paths), p10/p50/p90 **bands**, real-dollar framing, Social Security modeled, and the honest line _"shows the range of outcomes — not a promise."_ Most consumer apps show one deterministic number; this is closer to Boldin / ProjectionLab. A credibility asset.
- **Security architecture is a differentiator.** Zero-knowledge AES-256 with password + recovery-code key wrapping. Privacy-first **without account linking** is a real wedge against Monarch/Empower (who require bank aggregation).
- **Test rigor.** 677 tests, golden scenarios to 4 decimals, cross-module journey tests, a CI gate. RMD / tax / amortization are pinned. Arithmetic-accuracy risk is low.
- **Advice language is responsible.** "Rule-of-thumb estimate… not a recommendation," "advisors recommend 10–15%." It does **not** name specific securities or build personalized portfolios — exactly what keeps it on the right side of the investment-adviser line.

---

## 🔴 Launch blockers (must clear before submit)

### B-L1 — The "zero-knowledge, even we can't read it" claim collides with the AI-tips feature
`analyzeExpenses()` (`src/services/economicData.ts`) ships **expense categories, store names, amounts, and income** to a server proxy → Anthropic. Today it's inert (no `AI_PROXY_URL`), but the feature exists. If it ships enabled, the absolute privacy claim becomes **false for that feature**, and it trips Apple's **Nov-2025 rule** requiring explicit disclosure + consent before sending personal data to third-party AI.
**Fix:** ship AI-tips **off** for v1, _or_ add a separate opt-in consent screen + disclosure + update the privacy policy, **and** soften the absolute claim to "your stored data is encrypted so even we can't read it" (scoped to storage). Highest-priority item — the privacy promise is the brand.

### B-L2 — Crash reporting must actually be wired
`src/services/crashReporter.ts` exists but was last noted as "set-up required." Launching a money app with no production error visibility is a non-starter. **Fix:** confirm a live Sentry (or equivalent) DSN is configured and reporting in the production build.

### B-L3 — Disclaimer at every projection / "on track" verdict, not just Settings
The disclaimer is on several advice screens (Tax, Credit, Retirement cockpit, Estate, Settings) — good. **Fix:** confirm it also sits at the **headline retirement-readiness number** and the savings-rate nudges, and replace any imperative "you should" with "consider." Disclaimers don't override function, but consistent point-of-advice framing is what keeps a _planning tool_ a planning tool.

### B-L4 — Graceful network degradation on the data feeds
`src/services/economicData.ts` (BLS / Treasury / AI proxy) has **no try/catch**, and that data feeds inflation into the projections. A failed fetch must fall back to a sane default — never surface an error or corrupt a projection. **Fix:** wrap the fetches (or verify every caller does) and assert a default-on-failure path with a test.

---

## 🟠 Important (fix before launch; not a hard gate)
- **Verify the bug ledger is actually clean.** A few `open` / `by-design?` rows remain in `docs/finwise-bug-ledger.md` — confirm none are user-facing money errors before submit.
- **QA leans on manual device testing** (ML Kit blocks the simulator). The automated suite is strong now, but **run the Maestro flows on a real device** before submit — the selectors have never executed for real.
- **App Store fintech risk is low but non-zero.** Apple's "money-management apps must come from the licensed financial institution" clause targets apps that _transact / hold money / link accounts_ — FinWise does none of these. Put a reviewer note ready: _"informational/educational planning tool, no money movement, no account linking, no securities recommendations."_ Fintech approvals are famously inconsistent.

---

## 🟡 Positioning (be honest with yourselves — not blockers)
- **"Every country" is a stated objective; the app is USD-only** (currency picker removed). Scope the launch **US-only** explicitly; don't market global. GLBA / state-privacy obligations also assume a US footprint.
- **The product bet is "planning without account linking."** That's the privacy differentiator _and_ the churn risk: manual entry + a long onboarding is friction. Watch **onboarding completion** as the #1 launch metric.

---

## Bottom line
A **strong, shippable app with a credible financial core.** I'd approve once the **four blockers** clear — all scoping / config / copy fixes, not engineering rewrites. The one to watch hardest is **B-L1**: resolve the AI-vs-privacy tension cleanly and FinWise launches as a genuinely differentiated, privacy-first planner.

---

## Sources (standards this review is grounded in)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Nov-2025 third-party-AI data rule (TechCrunch)](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/) · [Navigating fintech App Store approvals (Nat Law Review)](https://natlawreview.com/article/long-and-winding-road-navigating-fintech-and-crypto-app-approvals-apple-store)
- [Investment-adviser regulation: education vs advice (InnReg)](https://www.innreg.com/blog/investment-advisor-regulation) · [Registered Investment Adviser (FINRA)](https://www.finra.org/investors/investing/working-with-investment-professional/investment-advisers)
- [GLBA & state privacy laws for non-bank fintech (Orrick, 2025)](https://www.orrick.com/en/Insights/2025/07/Where-is-the-GLBA-Entity-Level-Exemption-Two-More-State-Privacy-Laws) · [Fintech & GLBA applicability (Cooley)](https://cdp.cooley.com/fintech-faces-expanded-applicability-of-glbas-privacy-and-security-requirements/)
