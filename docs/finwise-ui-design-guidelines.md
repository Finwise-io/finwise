# Finwise Mobile — UI Design Guidelines (Standards)

> **What this is.** The rulebook for how Finwise should look, feel, and behave. If you're designing or
> building any screen, these are the standards to follow. Written in plain English so anyone — a new
> designer, an engineer, a future you — can pick it up and apply it without prior context.
>
> **Companion doc:** how the current app measures up against these standards (with priorities) lives in
> **`finwise-ui-compliance-audit.md`**. This file is the *target*; that file is the *scorecard*.

**The one idea behind everything:** money is emotional and high‑stakes, so Finwise's job is to be a
**trusted, calm, empowering companion** — a coach, never a spreadsheet, never a scold. Three feelings
must come through on every screen:

1. **Trusted** — "my money and data are safe here."
2. **Calm** — "I'm not overwhelmed; I know the one thing to look at."
3. **Empowered** — "I understand what's happening and what to do next."

If a design choice doesn't serve at least one of these, reconsider it.

**How each section is written:** a plain **rule**, then **Do / Don't** examples, and — where it helps —
a short note on *why* or *how*. Concrete references to our real tokens and components (in
`src/utils/theme.ts` and `src/components/UI.tsx`) are the Finwise standard; use them, don't reinvent.

### Three product questions (answered)
- **Hero metric** — the most valuable thing the app shows. Recommendation: **"Am I keeping money this
  month, and is my net worth growing?"** — i.e. **monthly cash‑flow + net worth**. This anchors every
  screen ("what leads here?"). *Confirm this, because it decides what's above the fold everywhere.*
- **High‑stakes moments** — every irreversible action has a mapped happy path with friction
  **proportional to the stakes** (see §2.3). Small action → small confirm; big action → real gravity.
- **Scalable system** — yes: assemble new products (loans, insurance) from existing tokens +
  components. The scaling risk is **screen density**, so the rule is *progressive disclosure first*
  (§3.1) — add depth behind layers, not more cards on the surface.

---

# Part 1 — Foundations (the design system)

> The visual language. Rule zero: **use the tokens; never hard‑code a value.**

## 1.1 Color — color carries meaning, not decoration
One brand accent; semantic colors that always mean the same thing.

- **Brand (teal/green):** `primary #178F6B` (+ dark/deep/light/mid variants).
- **Green = reassurance** ("you're good"). **Amber = heads‑up** ("worth a look"). **Red = true alert
  only** (a real problem or a destructive action). **Blue = neutral info.** Each has a *light* tint and
  a *base/dark* text color.
- **Neutrals** carry the layout (white cards on `#F6F7F5`); **text** in three weights (primary /
  secondary / tertiary).

**Do** use the *light* variant as a background tint with the *base/dark* variant for text on it (how
`Badge` and the insight box work). A retiree slightly off‑track is **amber**, not red.
**Don't** paint whole screens in dark brand green by default (calm = mostly neutral, color for
emphasis); don't invent hex values in a screen.

## 1.2 Typography — a small scale; size + weight = hierarchy; the user can enlarge it all
- **Sizes:** `xs 11 · sm 13 · base 15 · md 17 · lg 20 · xl 24 · xxl 30 · hero 38`. **Weights:**
  `400 · 500 · 600 · 700`. Platform‑native font.
- **Text scaling is a first‑class feature:** the user can make *all* text bigger (Default / Large /
  Larger). Every layout must survive the largest setting without clipping.

**Do** make money the loudest thing (use `AmountText`, sizes 20–38); pair bigger size with heavier
weight for titles; keep body regular. **Don't** use fixed heights that clip enlarged text.
**Standard to adopt:** name your text roles (Title / Body / Caption) instead of picking sizes ad‑hoc.

## 1.3 Spacing, radii, shadows — rhythm and depth from a fixed scale
- **Spacing:** `4 · 8 · 12 · 16 · 20 · 24 · 32` (16 is the base unit). **Radii:** `8 · 12 · 16 · 24 ·
  pill`. **Shadows:** `card` (subtle) and `strong` (sheets/modals).

**Do** use `Radii.lg` for cards, `pill` for chips, `Shadows.card` for surfaces. **Don't** crowd — when
a screen feels dense, **remove a card, don't shrink the gaps.** Whitespace is how "calm" is built.

## 1.4 Iconography & the mascot
- **Emoji‑first** icons (fast, recognizable). **Centi**, the coin mascot, appears in onboarding and at
  milestones — warm, delightful, dismissible.

**Do** pair every icon with a text label. **Don't** rely on an icon alone to carry meaning; don't let
Centi block or nag.

## 1.5 Component library — use these, don't reinvent
Assemble screens from the shared set. A bespoke style is a smell.

| Component | Use it for |
|---|---|
| `Card` / `DarkCard` | content surfaces (Dark = emphasis) |
| `Button` (primary·secondary·ghost·danger × sm·md·lg) | actions — **one primary per screen** |
| `Badge` (green·red·amber·blue·gray) | status pills |
| `ProgressBar` | budgets, goals, XP |
| `SegmentedControl` | toggles (Simple⇄Advisor, $/%) |
| `SectionHeader` | section title + optional "See all" |
| `TipCard` (green·amber·red·blue) | tips / callouts |
| `AmountText` (md·lg·xl·hero) | currency — scales with text‑size, single place to format money |
| `IconCircle` | emoji/icon in a tinted circle |
| `EmptyState` | no‑data on‑ramps (§3.4) |
| **`Donut` + "nwHero"** | the donut + legend wealth/nest‑egg view |
| **`Callout` / `insightBox`** | the green insight box — verdicts and key takeaways |

**Do** extend a component, never fork it. **Don't** rebuild a donut, callout, or card — consistency
*is* the trust signal.

## 1.6 Motion — subtle, and it explains cause and effect
A number counts up, a bar fills, a sheet slides in. **Do** keep motion purposeful and honor the OS
"reduce motion" setting. **Don't** animate for decoration.

## 1.7 Number, currency & date formatting — *consistency is trust*
The same number must look the same everywhere. This is foundational for a money app.

- **Money:** whole dollars on dashboards/summaries (no cents); cents only where precision matters (one
  transaction, an interest rate). **Compact** in tight/large spaces — `$1,250` → `$1.3K`, `$2,500,000`
  → `$2.5M`. **Negatives** use a minus sign (`−$120`), never parentheses and never color alone. Always
  show the currency symbol. **Use one formatter** (the shared `money` / `moneyCompact`) — never
  hand‑format.
- **Percentages:** one decimal for rates (`4.1%`), whole numbers for casual stats (`78% of futures`).
- **Dates:** `Jun 14` (short), `June 2027` (month‑year goals), relative where friendly ("in 5 days",
  "last month").

**Do** make a concept identical across screens — "take‑home" is the same figure, same label,
everywhere. **Don't** mix cents and whole dollars in the same view, or format the same value two ways.

## 1.8 Layout & ergonomics — one column, thumb‑friendly, fits every device
- **Single column**, card‑stacked, scrollable. **Most important first** (the hero is above the fold).
- **Thumb zone:** put primary actions within easy reach (bottom/center); keep destructive actions
  *away* from where a thumb rests. The floating "+ Add" lives bottom‑center.
- Respect **safe areas** (notch, home indicator). Work **one‑handed**. Re‑check every layout at the
  **Larger** text setting.

**Do** lead with the answer and one primary action. **Don't** place "delete" under the thumb, or push
the hero below the fold.

---

# Part 2 — Trust & Security
> Users must *feel* their money and data are under constant, vigilant protection.

## 2.1 Visual trust cues + reassuring microcopy
During anything sensitive (sign‑up/in, money actions, errors), show a recognizable safety cue (lock /
shield) and say, plainly, that they're protected. **Do** add a one‑liner like *"Your data is encrypted
on your device."* **Don't** make security silent — if it's there, say so, calmly.

## 2.2 Privacy‑Blur — hide balances on demand
Let users hide balances and account numbers with one tap, so they can open the app in public without
anxiety. **Standard:** a global **"Hide balances"** toggle (Settings + a quick eye icon) that replaces
money with `••••` everywhere. Because all money renders through `AmountText`, wire the toggle there
once and it covers the whole app. Remember the choice; allow Face/Touch ID to reveal.

## 2.3 Purposeful friction — gravity for high‑stakes actions
Slow down irreversible/high‑value actions on purpose; keep everyday taps frictionless.

**Do** match friction to stakes: a simple tap‑confirm to delete one expense; a **slide‑to‑confirm** or
**biometric** check for "reset all data" or (future) large transfers — with stakes stated plainly and a
reassurance ("your data is saved on this device"). **Don't** add friction to routine taps — logging an
expense stays one tap.

## 2.4 Transparent error handling — no codes, ever
Say *what* happened, *that their money is safe*, and *how to fix it*. **Template:**
**[plain what] + [reassurance] + [next step]** — e.g. *"We couldn't reach your bank. Your money is
safe. Try again in a few minutes."* **Do** offer the recovery action inline. **Don't** show error
codes, stack traces, or dead ends.

## 2.5 Error prevention + Undo — forgiving by default
Prevent mistakes before you have to handle them, and make actions reversible.

- **Prevent:** constrain inputs (numeric keypad for money), use smart defaults, and only confirm when
  the stakes are real.
- **Undo over "are you sure?":** for reversible actions, prefer a quiet **"Deleted · Undo"** toast to a
  blocking dialog. **Autosave everything.** Users must never be able to "break" their data.

## 2.6 Privacy & permissions UX — ask in context, give people their data
- **Permission priming:** ask for camera (receipt scan) or notifications **only when first needed**,
  with a plain reason, *before* the OS prompt — never on launch.
- **Data rights:** make **export** and **delete‑all** easy and clearly labeled — *"Your data lives on
  your device. Here's how to export it or erase it."* Being able to leave builds trust to stay.

---

# Part 3 — Clarity Through Design
> Financial data is complex; the UI's job is to give one clear answer at a time.

## 3.1 Progressive disclosure — Simple first, depth on demand
Show the high‑level answer first; let users drill in only when they choose. **Simple** mode = one
verdict, one chart, one action; **Advisor** mode (and drill‑downs) hold the detail, assumptions, and
jargon. **Do** make Simple genuinely simple. **Don't** show everyone every number — density is the
scaling risk.

## 3.2 Breadcrumb onboarding — one question per screen, clear progress
Single‑input steps with human section labels ("Income · 3 of 7" reads far calmer than "Step 9 of 27"),
a progress bar, and save‑and‑resume. **Do** keep each step to one decision and show where they are.
**Don't** trap the user — every step is skippable, with a soft placeholder to complete later.

## 3.3 Contextual education — explain jargon right where it appears
When a financial term is unavoidable, explain it in one plain sentence, in place, and let it go.
**Standard:** a reusable **ⓘ "what's this?"** that opens a one‑line definition, plus a small **glossary**
reachable from any term. **Do** define on first use. **Don't** assume the user knows "APR," "RMD," or
"diversification."

## 3.4 Empty states as on‑ramps — never a blank screen
Empty space teaches or invites the next step. **Do** make every empty state a single clear CTA or a
one‑line lesson ("Nothing yet — tap + to add an expense"). **Don't** show "No data."

## 3.5 Forms & money input — fast, forgiving, pre‑filled
Finwise is input‑heavy, so inputs must be effortless.

- **Money fields:** numeric keypad, **format as the user types**, currency symbol shown, no need to
  type commas.
- **Validation timing:** validate on blur or submit, **not on every keystroke**; show the error inline
  under the field, in plain language, with how to fix it.
- **Defaults & prefills:** prefill from what we already know; sensible defaults (this month, USD).
  Clearly mark **optional vs required**; keep required fields to the minimum.

## 3.6 State design — define every state, not just the happy one
Every data view should design all of these:

| State | What to show |
|---|---|
| **Loading** | **skeleton placeholders** (the shape of the content), not a blank spinner |
| **Empty** | an on‑ramp (see §3.4) |
| **Partial / stale** | show what we have + a quiet "updating… / as of …" note |
| **Offline** | a quiet banner — "Offline — changes saved on this device"; queue and sync later |
| **Error** | plain‑language, recoverable (see §2.4) |
| **Success** | a brief confirm (toast/checkmark); don't over‑celebrate routine actions |

---

# Part 4 — Human‑Centered Personalization
> Make the app feel like a coach who knows *this* user — celebrate progress, never shame.

## 4.1 Data storytelling — turn numbers into a sentence about the person
Lead with the story and the *so‑what*, then the action: *"You spent 15% less on dining out than your
average"* — not a raw table. **Do** attach the next step to each insight. **Don't** dump a spreadsheet
and make the user find the meaning.

## 4.2 AI / "show your work" — explainable, never a black box
Finwise is an AI coach (projections, scores, tips), so users must trust the *numbers and advice*, not
just the encryption.

- **Every projection, score, or suggestion answers "how did you get this?"** in one plain sentence, on
  tap (e.g. "across ~400 possible market futures…", "your card is at 22% APR…").
- **Label estimates as estimates**, show the assumptions, and let users adjust them.
- **Do** show the inputs behind a verdict. **Don't** present a money figure the user can't trace.

## 4.3 Adaptive dashboard — Home reflects *their* priorities
Home adapts to the user's life stage by default, and the user can **pin / reorder / hide** cards so the
top of Home is whatever matters most to them (debt payoff, a goal, net worth). **Do** make smart
defaults *and* allow the override. **Don't** force one fixed layout on everyone.

## 4.4 Behavioral encouragement — celebrate, never scold
Reinforce good habits with progress and celebration (XP, levels, badges, streaks, milestone moments).
Frame overspending as a neutral **heads‑up with a next step**, in amber — never red shame language.
**Do** celebrate streaks and goals hit. **Don't** say "you failed" or "you overspent again."

## 4.5 Proactive communication — notifications that help, never nag
- Time‑relevant, actionable, dismissible (bill due in 3 days, RMD this year, "you hit your goal 🎉").
- **Frequency caps**, **per‑type user controls**, quiet hours; each notification **deep‑links** to the
  relevant screen. **Don't** send routine or duplicate pings.

---

# Part 5 — Accessibility & Inclusivity
> Finwise must work for everyone — every ability, every device. Treat this as launch‑critical.

## 5.1 Beyond color — never color alone
Always pair a colored status with an icon and/or word (✓ / ! / ⚠️ + a label). **Don't** ship a
red/green‑only signal.

## 5.2 WCAG 2.1 AA — contrast and legibility
Meet **AA contrast** for all text and financial data (including donut legends, chips, secondary text on
tinted backgrounds), and stay legible at the **Larger** text setting. Provide a **high‑contrast theme**
(and a dark theme) — built as a token swap.

## 5.3 Supportive input — big targets, full screen‑reader support
- **Touch targets ≥ 44×44 pt** — grow the element, not just its tap‑slop.
- **Works fully with VoiceOver / TalkBack:** every interactive element has an `accessibilityLabel` and
  role; money values speak their meaning ("Net worth, $42,300"). Test the core flows with both screen
  readers.

## 5.4 Document accessibility — readable exports
Anything we generate to read or keep (statements, tax summaries) must be **tagged, selectable text**,
not a flat image, so screen readers can read it.

---

# Part 6 — UI best practices (working rules)

| Topic | The standard |
|---|---|
| **Data viz** | Keep charts simple; **always offer a "raw data" / table toggle** (helps power users *and* screen readers). |
| **Navigation** | Standard patterns only — **bottom tabs** + native sheets. Minimize the learning curve. |
| **Motion** | Subtle transitions that signal cause→effect; reduce‑motion aware. |
| **Consistency** | One design system; same component = same look and behavior everywhere. Reuse, don't fork. |
| **Communication** | Plain language; proactive, calm status updates (incl. offline/sync). |

---

# Part 7 — Voice, tone & terminology
Write like a calm, encouraging friend who happens to know money. Second person, plain English, and
**never shame.**

- **Plain English, spelled out** — "Required Minimum Distribution (the amount you must withdraw)" over
  a bare acronym.
- **Every number gets a meaning** — "$3,000 a year — about one month of expenses."
- **Lead with the answer**, then the detail. **Reassure under stress** ("your money is safe").
- **One approved word per concept (terminology standard).** Pick one term and use it everywhere — e.g.
  **take‑home** (not "net" / "after‑tax" interchangeably), **nest egg**, **spending**, **left over**.
  New copy uses the approved word. Keep the list in this section as it grows.

| Don't | Do |
|---|---|
| "Error 402: request failed." | "We couldn't load that. Your data is safe — try again in a moment." |
| "78%" (alone) | "✅ Looking good — lasts past 90 in most futures (78% of scenarios)." |
| "Decumulation withdrawal rate: 4.1%." | "You're taking out about 4% a year — a safe pace." |
| "You overspent on dining." | "Dining's running a bit high this month — here's the budget." |

---

# Part 8 — Design governance (keeping the system healthy)
The system only stays consistent if it's maintained.

- **Single sources of truth:** tokens in `src/utils/theme.ts`, components in `src/components/UI.tsx`,
  rules in **this document.**
- **Adding a product (loans, insurance, etc.):** assemble it from existing tokens + components. If a
  genuinely new pattern is needed, **add it to the component library + this doc** — never fork a
  one‑off style inside a screen.
- **Review gate:** check every new screen against this document (and the open items in the Compliance
  Audit) before merge. As gaps close, update the audit so the two stay in sync.

---

### Appendix — where the system lives
- Tokens: `src/utils/theme.ts` · Text scaling: `src/utils/fontScale.ts` · Components:
  `src/components/UI.tsx` · Mascot: `src/onboarding/Mascot.tsx`
- Signature patterns: `src/screens/NetWorthScreen.tsx` (Donut + hero); `src/onboarding/modules.tsx` &
  `src/screens/RetirementCockpit.tsx` (Callout / insight box)
- Navigation: `app/(tabs)/_layout.tsx` · Home: `src/screens/HomeScreen.tsx` · Insights:
  `src/domain/insights` · Gamification: `src/screens/RewardsScreen.tsx`
- Security: `src/store/secureStorage.ts` · Settings (display mode, text size):
  `src/screens/SettingsScreen.tsx`
- **Scorecard:** `docs/finwise-ui-compliance-audit.md` · Bug ledger: `docs/finwise-bug-ledger.md`
