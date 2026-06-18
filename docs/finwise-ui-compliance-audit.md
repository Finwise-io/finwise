# Finwise Mobile — UI Compliance Audit

> **What this is.** A snapshot of how the Finwise mobile app measures up against the standards in
> **`finwise-ui-design-guidelines.md`** today. It's the *scorecard* to that file's *rulebook*.
> The ❌ / 🟡 rows are the **design backlog**, prioritized. Keep this file updated as gaps close.
>
> **Status key:** ✅ **strong** (we do this well) · 🟡 **partial** (started, not finished) · ❌ **gap**
> (not done). Each claim cites the file where the behavior lives. Audited 2026‑06‑17.

---

## At a glance
Finwise **already lives most of these standards in code** — a real token system, app‑wide text
scaling, plain‑language errors, breadcrumb onboarding, Simple/Advisor, data‑storytelling insights,
gamification, and on‑device encryption. The genuine gaps cluster in **accessibility** (screen‑reader
support, tap‑target sizes), **privacy UX** (hide‑balances, data export), and **state/feedback polish**
(skeletons, offline indicator, undo).

**Do these first (launch‑critical):**
1. **G‑13** Screen‑reader labels (VoiceOver/TalkBack) — essentially absent.
2. **G‑14** 44×44 touch targets.
3. **G‑16** Privacy‑Blur (hide balances).
4. **G‑15** Slide‑to‑confirm / biometric for the heaviest actions.

---

## Section‑by‑section findings

### Part 1 — Foundations
- ✅ **Tokens** — full color/type/spacing/radii/shadow system in `src/utils/theme.ts`, consumed
  everywhere via `StyleSheet`. No hard‑coded drift of note.
- ✅ **Text scaling** — Default/Large/Larger patches RN `Text`/`TextInput` app‑wide (`src/utils/fontScale.ts`).
- ✅ **Component library** — `src/components/UI.tsx` (Card, Button, Badge, ProgressBar, TipCard,
  AmountText, EmptyState…) + signature `Donut`/`nwHero` (`NetWorthScreen.tsx`) and `Callout`/`insightBox`.
- 🟡 **Number/currency/date formatting** — uses `Intl.NumberFormat` + shared `money`/`moneyCompact`;
  mostly whole‑dollar. **No written standard**, and we've had drift (bug ledger **B‑46**: cents shown
  against the whole‑dollar style). Codify §1.7.
- 🟡 **Layout & ergonomics** — single‑column card stacks, floating "+ Add", safe areas handled; **no
  formal thumb‑zone or Larger‑text layout audit.**
- 🟡 **Named text styles / line‑heights** — applied ad‑hoc; no Title/Body/Caption roles.
- 🟡 **Motion** — minimal; no purposeful micro‑interactions; reduce‑motion not wired.
- ❌ **Dark / high‑contrast theme** — light‑only.

### Part 2 — Trust & Security
- ✅ **Encryption at rest** — AES‑256 key in keychain/keystore, encrypted blob in storage
  (`src/store/secureStorage.ts`).
- ✅ **Plain‑language errors** — conversational, recovery‑oriented (`AuthScreen.tsx`, `ExpenseScreen.tsx`,
  `TipsScreen.tsx` offline fallback). Strong.
- ✅ **Destructive‑action confirmations** — clear stakes + reassurance (`SettingsScreen.tsx` reset/sign‑out).
- 🟡 **Permissions** — camera asked in context (`ExpenseScreen.tsx` "Camera needed"); **priming and a
  notifications‑permission story are unclear.**
- 🟡 **Data rights** — delete‑all exists ("Reset all data"); **no data export.**
- ❌ **Visual trust cue surfaced in UI** — encryption is real but not *shown* (no lock/"encrypted" line).
- ❌ **Privacy‑Blur** — balances always visible.
- ❌ **Slide‑to‑confirm / biometric** — heaviest actions only use a tap dialog; no biometric anywhere.
- ❌ **Undo** — destructive actions use blocking dialogs, no "Deleted · Undo" toasts (autosave ✅, though).
- ❌ **Offline / sync indicator** — partial offline handling (tips) but no app‑wide status.

### Part 3 — Clarity
- ✅ **Progressive disclosure** — Simple/Advisor (`store.displayMode`); Retirement leads with a verdict +
  "See the details" (`RetirementCockpit.tsx`).
- ✅ **Breadcrumb onboarding** — one‑input steps, "Income · 3 of 7", progress bar, save‑and‑resume,
  Centi (`OnboardingScreen.tsx`, `modules.tsx`, `Mascot.tsx`).
- ✅ **Empty states** — `EmptyState` + contextual copy throughout.
- 🟡 **Contextual education** — terms explained well *inline* (RMD, Roth, 529, Monte‑Carlo, APR) but
  **no reusable "what's this?" tooltip and no glossary.**
- 🟡 **Forms & money input** — money fields/numeric input exist and prefill; **validation timing is
  inconsistent and there's no undo.**
- 🟡 **State design** — empty ✅ and error ✅, but **no skeleton loaders** and no stale/offline states.

### Part 4 — Personalization
- ✅ **Data storytelling** — ranked plain‑English insights with icon + story + action
  (`src/domain/insights`, `InsightsScreen.tsx`).
- ✅ **AI explainability (mostly)** — strong inline "how we got this" (Monte‑Carlo note, insight bodies,
  RMD math) — but **not a consistent, tappable affordance everywhere.** Make §4.2 the rule.
- ✅ **Behavioral encouragement** — XP/levels/badges/streak (`RewardsScreen.tsx`), neutral (non‑shaming)
  budget copy.
- 🟡 **Adaptive dashboard** — Home adapts by **persona** (`personaOf()`), but users **can't pin/reorder/hide** cards.
- 🟡 **Notifications** — push is configured at the platform level and in‑app reminders exist (RMD card,
  bill due), but there's **no notification design system** (frequency caps, per‑type controls).

### Part 5 — Accessibility
- ✅ **Beyond color** — status pairs color with icon/label (Badge, ▲/▼ deltas, ✅/⚠️ verdicts).
- ✅ **Text scaling** — see Part 1.
- 🟡 **Touch targets** — many rely on `hitSlop` 6–14 px (**below 44×44**).
- 🟡 **WCAG AA contrast** — **not formally audited**; no high‑contrast theme.
- ❌ **Screen‑reader support** — `accessibilityLabel` / `accessibilityRole` essentially **absent**. The
  single biggest gap; the app is **not VoiceOver/TalkBack ready.**
- ❌ **Document accessibility** — n/a yet (no exports); rule applies when we add statements.

### Part 6–8 — Best practices, voice, governance
- ✅ **Navigation** — standard bottom tabs (Home·Budget·Invest·Retire·Plan) + menu grid (`app/(tabs)/_layout.tsx`).
- ✅ **Voice/tone** — conversational, second‑person, numbers paired with meaning.
- 🟡 **Raw‑data toggle on charts** — charts have no table/raw view (cognitive‑load + a11y miss).
- 🟡 **Terminology standard** — mostly consistent but drift exists (bug ledger **B‑52** "savings rate";
  "take‑home" vs "net"); **no controlled‑vocabulary list.**
- 🟡 **Governance** — tokens/components are centralized ✅, but the review gate is only now written down
  (this doc + the Standards doc); adopt it as a merge check.

---

## Gap register (the backlog)
Prioritized. "Std §" points to the rule in the Standards doc.

| ID | Gap | Std § | Status | Priority |
|---|---|---|---|---|
| G‑13 | **Screen‑reader labels** (`accessibilityLabel`/role) app‑wide | 5.3 | ❌ | **P0** |
| G‑14 | **44×44 touch targets** (grow elements, not just hitSlop) | 5.3 | 🟡 | **P0** |
| G‑16 | **Privacy‑Blur** — hide balances toggle (wire through `AmountText`) | 2.2 | ❌ | **P1** |
| G‑15 | Slide‑to‑confirm / biometric for heaviest actions | 2.3 | ❌ | **P1** |
| G‑25 | **Skeleton loaders** + offline/sync states (full state matrix) | 3.6 | 🟡 | **P1** |
| G‑11b | **Undo** toasts for reversible deletes (forgiving design) | 2.5 | ❌ | **P1** |
| G‑17 | Reusable **"what's this?"** + glossary for jargon | 3.3 | 🟡 | P2 |
| G‑26 | **Money/date formatting standard** (one rule; fixes cents drift) | 1.7 | 🟡 | P2 |
| G‑18 | **User‑pinnable / reorderable Home** | 4.3 | 🟡 | P2 |
| G‑19 | **Raw‑data / table toggle** on charts | 6 | 🟡 | P2 |
| G‑20 | **Offline / sync indicator** banner | 2.4 / 3.6 | 🟡 | P2 |
| G‑27 | **AI "show your work"** — consistent tappable explainer | 4.2 | 🟡 | P2 |
| G‑28 | **Data export** (+ keep delete‑all) | 2.6 | 🟡 | P2 |
| G‑29 | **Permission priming** (camera/notifications) before OS prompt | 2.6 | 🟡 | P2 |
| G‑30 | **Notification design system** (caps, per‑type controls, deep‑link) | 4.5 | 🟡 | P2 |
| G‑31 | **Terminology standard** — controlled vocabulary list | 7 | 🟡 | P2 |
| G‑21 | **Dark + high‑contrast themes** (token swap) | 1.1 / 5.2 | ❌ | P2 |
| G‑32 | **WCAG AA contrast audit** (text + data viz) | 5.2 | 🟡 | P2 |
| G‑33 | **Thumb‑zone / Larger‑text layout audit** | 1.8 | 🟡 | P3 |
| G‑22 | **Named text styles** (Title/Body/Caption) + line‑heights | 1.2 | 🟡 | P3 |
| G‑23 | **Purposeful micro‑interactions** (reduce‑motion aware) | 1.6 | 🟡 | P3 |
| G‑34 | **Surface encryption** cue in the UI | 2.1 | ❌ | P3 |
| G‑35 | **Form validation timing** consistency (on‑blur/submit) | 3.5 | 🟡 | P3 |
| G‑24 | **Document accessibility** (tagged exports) | 5.4 | ❌ | when applicable |
| G‑36 | **Governance review gate** adopted as a merge check | 8 | 🟡 | ongoing |

**Already met (no action) — kept for the record:** token system, app‑wide text scaling, shared
component library, plain‑language errors, breadcrumb onboarding, empty‑state on‑ramps, data
storytelling, gamification (no‑shame), progressive disclosure, encryption at rest, destructive‑action
confirmations, beyond‑color status, standard bottom‑tab navigation, conversational voice/tone.

---

### Cross‑references
- Standards: `docs/finwise-ui-design-guidelines.md`
- Engineering bug ledger (overlaps on a11y, formatting B‑46, terminology B‑52): `docs/finwise-bug-ledger.md`
