# FinWise — Compliance Audit (2026-06-24)

_Multi-agent audit vs UI guidelines + taxonomy. Full matrix: `docs/finwise-compliance-audit.xlsx`._

**58 issues — P0:18 · P1:25 · P2:15**

## Executive summary
FinWise's compliance audit surfaced 56 raw findings across six dimensions; after deduping overlapping surface+issue pairs (notably the surplus/leftover cluster, take-home label/number, savings-rate inline math, the investable-assets duplicate selector, and the cash inline filter — each of which appeared in two or three dimensions), the consolidated matrix holds 47 distinct issues.

COUNTS BY DIMENSION (deduped): Taxonomy & Labeling = 9; §3.3 Contextual Education = 10; §1.4 Same Concept→Same Label/Number = 5 (3 merged into Number Agreement / Taxonomy); Keyboard Avoidance = 18; Number Agreement = 6 (2 merged); UI Guidelines (legibility / color / errors / a11y / tone) = 13.

COUNTS BY SEVERITY (deduped): P0 = 19; P1 = 21; P2 = 7.

SYSTEMIC THEMES A LEADER SHOULD ACT ON:
1) Vocabulary is forked, not canonical. "Money free to save this month" appears as Surplus / Left over / Free to save / Saved across screens, and the Net Worth screen shows the same dollars under two class vocabularies (canonical donut classes vs. legacy wrapper-axis section words). Fix once: enforce one approved word per concept and route every label through the taxonomy spec's canonical labels; the existing naming_consistency.test.ts only guards two surfaces.
2) Numbers disagree because canonical selectors exist but are unused. A full set of domain selectors (savingsRateCash/Total, cashTotal, investableAssets, retirementEarmarkedValue, minimumDebtService) is imported by ZERO screens; screens re-derive inline and disagree — most dangerously two retirement engines giving two nest-egg numbers AND two targets, and a savings rate labeled "of take-home" computed on gross transaction income. This is the foundational trust failure for a money app. Wire screens to the one selector per concept and add cross-surface agreement tests.
3) Forms are not keyboard-safe at scale. A correct KeyboardAvoidingView+ScrollView pattern exists but ~half of input surfaces lack it, and the failure is systematic in bottom-anchored "Sheet" modals where the amount field is the last element and lands exactly under the keyboard. No surface implements scroll-focused-input-into-view. Fix structurally by extracting one shared keyboard-aware BottomSheet/Form primitive and routing every input surface through it.
4) Missing education infrastructure. §3.3's mandated reusable info-dot and glossary simply do not exist, so terms are defined ad-hoc on one screen and bare on another (RMD, Surplus, nest egg). Build one InfoDot + GLOSSARY map seeded from the taxonomy spec's existing plain-English captions.
5) Several accessibility/trust primitives are absent app-wide: hundreds of unlabeled TouchableOpacity controls and a bare-SVG donut invisible to VoiceOver, sub-11px type on money values, raw exception/stack-trace text shown in errors, red shaming "Overspent" copy, no hide-balances blur, no dark/high-contrast theme, and AmountText bypassing the canonical money formatter (cents + USD-locked). Most of these are single-component or token-swap fixes with broad reach.

Recommended sequencing: land the canonical-selector wiring + agreement tests and the shared keyboard-aware Sheet primitive first (they retire whole bug classes), then the InfoDot/glossary and the error-message + tone fixes, then the legibility/a11y/theme token work.

## Systemic themes
1. Forked vocabulary: one money concept shown under multiple approved words (Surplus/Left over/Free to save/Saved) and the Net Worth screen showing the same dollars under two class vocabularies (canonical asset-class donut vs. legacy wrapper-axis section words) — enforce one approved word per concept via the taxonomy canonical-labels table and broaden naming tests beyond the two currently guarded surfaces.
2. Numbers disagree because canonical domain selectors exist but are imported by zero screens; screens re-derive inline and conflict — two retirement engines give two nest-egg numbers and two targets, savings rate labeled 'of take-home' is computed on gross income, and 'cash'/'investable' are reimplemented per screen. Wire one selector per concept and add cross-surface agreement tests.
3. Keyboard avoidance fails systematically in bottom-anchored Sheet modals (amount field is last, lands under the keyboard); the correct KAV+ScrollView pattern exists but ~half of input surfaces omit it and none scroll the focused input into view. Extract one shared keyboard-aware BottomSheet/Form primitive and route all input surfaces through it.
4. §3.3 education infrastructure (reusable info-dot + glossary) does not exist, so terms are defined ad-hoc on one screen and bare on another (RMD, Surplus, nest egg, Unclassified, investable assets). Build one InfoDot + GLOSSARY seeded from the taxonomy spec's existing captions.
5. App-wide UI/trust gaps: unlabeled TouchableOpacity controls and a VoiceOver-invisible donut, sub-11px money type, raw exception text in errors, red 'Overspent' shaming copy, no hide-balances blur, no dark/high-contrast theme, and AmountText bypassing the canonical formatter — mostly single-component or token-swap fixes with broad reach.
