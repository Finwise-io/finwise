// THE OUTCOME — the answer at the top of the Plan tab (founder-approved 2026-08-12).
//
// ONE score on this screen: the odds. Everything else is arithmetic.
// The Claude Design handoff drew a second gauge — assets against a target — and building the function
// proved why it could not stay: progress compares ONE future (the middle one) against a threshold,
// while the odds count how many of the 400 futures lasted. A person can be 80% of the way along the
// middle path with 31% odds, because the spread is wide. Two proportional shapes side by side would
// have shown "mostly there" beside "probably not", and the eye believes the shape. So the money is
// money: three lines that subtract to each other, with the shortfall carrying the weight.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../utils/theme';
import { GaugeArc } from './GaugeArc';
import { TargetGauge } from './TargetGauge';
import { SectionBand } from './SectionBand';
import { InfoDot } from './UI';
import { maskedMoney, maskedPct, spokenMoney } from './useMoney';
import { planTarget, howTheGapCloses, leverDeltas, TARGET_ODDS } from '../domain/planning/target';
import { oddsLine } from '../domain/planning/hub';
import type { RetirementInputs } from '../domain/retirement';

export function PlanOutcome({ inputs, chance, band, horizonAge, retireAge, annualIncome, roomAnnual, roomFromMonthly, typedTarget, lens }: {
  inputs: RetirementInputs | null;
  chance: number;
  band: { low: number; high: number } | null;
  horizonAge: number;
  retireAge: number;
  annualIncome?: number;
  roomAnnual?: number;
  /** what they told us they put in each month — the room figure is derived from it, so the sentence
   *  names it rather than presenting the allowance as a fact we looked up. */
  roomFromMonthly?: number;
  /** THEIRS — what the person typed. Null until they do, and it never moves the odds (§6.1). */
  typedTarget?: number | null;
  lens: 'retired' | string;
}) {
  // the solves are ~a quarter-second of simulation — never on a render, only when a number moves
  const t = useMemo(() => (inputs ? planTarget(inputs, annualIncome, roomAnnual, typedTarget) : null),
                    [inputs, annualIncome, roomAnnual, typedTarget]);
  // the three parts of the closing sentence — computed once, from the function, never by hand
  const gap = useMemo(
    () => (inputs && t?.savingToTarget ? howTheGapCloses(inputs, t.savingToTarget.total) : null),
    [inputs, t?.savingToTarget?.total],
  );
  const levers = useMemo(() => (inputs && t?.impossible ? leverDeltas(inputs) : []), [inputs, t?.impossible]);

  const retired = lens === 'retired';
  const short = t?.targetAtRetirement != null ? t.targetAtRetirement - t.projectedAtRetirement : null;
  const spare = short != null && short < 0;
  // The median can clear the target while the odds do not — the spread is what separates them. When
  // the two disagree, saying "more than you need" beside "adding $43,000 closes it" is a plain
  // contradiction, so the gap line stands down and the bridge sentence speaks alone.
  const agrees = short != null && (t!.alreadyThere ? spare : !spare);

  return (
    <View style={s.wrap}>
      {/* quiet: a question is a section title, and ESTIMATE is a tag, not a total (v3 hierarchy) */}
      <SectionBand inCard quiet
        title="WILL MY MONEY LAST?"
        value="ESTIMATE"
      />

      {/* the one score */}
      <View style={s.gaugeRow} accessible
        accessibilityLabel={`Will my money last: ${oddsLine(lens, chance, horizonAge)}, an estimate${band ? `. In the worst markets ${band.low} percent, in the best ${band.high} percent` : ''}.`}>
        <GaugeArc pct={chance} />
        <View style={s.gaugeText}>
          <Text style={s.pct}>{chance}%</Text>
          <Text style={s.pctSub}>odds of lasting to age {horizonAge}</Text>
          {band && <Text style={s.band}>range {band.low}–{band.high}% across bad-to-good markets</Text>}
        </View>
        <InfoDot term="nestEggMath" />
      </View>

      {/* THE SECOND DIAL — their typed target, beside the odds. Two questions, two answers, and
          they are allowed to disagree: "am I hitting my own number" and "will the money last" are
          not the same question, and the screen must say both without either looking wrong.
          Retirees do not see it: a target is a "will I get there" framing, and once you are drawing
          down the question is "is this covering me", which the paycheck answers (audit D8). */}
      {!retired && t?.typedTarget != null && (
        <View style={s.targetRow} accessible
          accessibilityLabel={`${t.targetPct} percent of your target nest egg of ${spokenMoney(t.typedTarget)}.`}>
          <TargetGauge pct={t.targetPct} />
          <View style={s.gaugeText}>
            {/* HIDE-BALANCES, founder's words: "hide the number, keep the shape." The arc fills to
                where it would; the numeral dots out, because it is two dollar figures divided. */}
            <Text style={s.pct}>{maskedPct(t.targetPct)}</Text>
            <Text style={s.pctSub}>of your target nest egg</Text>
          </View>
        </View>
      )}

      {/* THE HERO SENTENCE — today's money against THEIR number. A plain subtraction, never function
          output, and it must never be drawn as a contradiction of the odds above it. */}
      {!retired && t?.typedTarget != null && t.shortOfTarget != null && (
        <Text style={s.heroLine}>
          <Text style={s.b}>{maskedMoney(inputs!.start_balance)}</Text> of your <Text style={s.b}>{maskedMoney(t.typedTarget)}</Text> target nest egg
          {t.shortOfTarget > 0
            ? <> — short <Text style={s.b}>{maskedMoney(t.shortOfTarget)}</Text></>
            : <> — <Text style={s.b}>{maskedMoney(-t.shortOfTarget)}</Text> more than you set</>}
        </Text>
      )}

      {/* OUR SUGGESTION, while theirs is blank — filled in, and labelled as ours (founder 2026-08-14).
          A blank target is a worse first experience than a sensible starting figure; what is not
          acceptable is showing our number and calling it theirs, which is what shipped before. */}
      {!retired && t?.typedTarget == null && t?.suggestedTarget != null && (
        <Text style={s.heroLine}>
          <Text style={s.b}>{maskedMoney(t.suggestedTarget)}</Text>
          <Text style={s.ours}> — our starting figure, not yours. Change it to your own number.</Text>
        </Text>
      )}

      {/* WHAT CLOSES THE GAP — the most actionable line on the screen, and the one the founder
          read and challenged: "$77,500 x 7 = $542,500, so how does that close $1,090,848?"
          It does not. GROWTH DOES NEARLY HALF THE WORK, and the first draft never said growth
          existed. Any sentence pairing a total gap with a per-year figure WILL be subtracted —
          treat that as a certainty, not a risk — so the breakdown sits right underneath.
          It also says "projects to", never "reaches": we run 400 simulations of an uncertain
          future and will not guarantee an outcome (§7.1, the same rule that banned "safe"). */}
      {!retired && t && !t.alreadyThere && t.savingToTarget && gap && (
        <>
          <Text style={s.bridge}>
            Saving <Text style={s.b}>{maskedMoney(t.savingToTarget.total)} a year</Text> to {retireAge} projects to
            about <Text style={s.b}>{maskedMoney(Math.round(gap.projectsTo / 1000) * 1000)}</Text>
            {t.typedTarget != null && gap.projectsTo >= t.typedTarget ? ' — just past your target nest egg.' : '.'}
          </Text>
          <Text style={s.gapNote}>
            Growth does almost half the work: {maskedMoney(gap.putIn)} from saving,
            {' '}{maskedMoney(gap.growthOnExisting)} growing what you already have, and
            {' '}{maskedMoney(gap.growthOnNew)} growing the new money as it goes in — an estimate, not a promise.
          </Text>
        </>
      )}

      {/* THE ODDS, LABELLED WHERE THEY SIT — never a page-level disclaimer claiming everything above
          it came from a simulation, when most of it is what the person told us (§7.2). */}
      {!retired && t && (
        <Text style={s.gapNote}>
          The odds come from about 400 runs of your own numbers through different markets.
        </Text>
      )}

      {t?.impossible && (
        <>
          <Text style={s.bridge}>
            {t.requiredExtraAnnual != null
              ? <>Reaching {TARGET_ODDS}% by saving alone would take <Text style={s.b}>{maskedMoney(t.requiredExtraAnnual)} a year</Text> — more than you earn. That number is real. Here's what actually moves it:</>
              : <>Saving alone cannot reach {TARGET_ODDS}% from here. That is real. Here's what actually moves it:</>}
          </Text>
          <SectionBand inCard quiet title="WHAT ACTUALLY MOVES IT" />
          {levers.map((l) => (
            <View key={l.key} style={s.lever} accessible accessibilityLabel={`${l.label}: worth ${l.points} points on your odds.`}>
              <Text style={s.leverLabel}>{l.label}</Text>
              <Text style={s.leverPts}>+{l.points} pts</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function Row({ label, value, spoken, strong, tone }: { label: string; value: string; spoken: string; strong?: boolean; tone?: 'good' | 'warn' }) {
  return (
    <View style={s.row} accessible accessibilityLabel={`${label}: ${spoken}`}>
      <Text style={[s.rowLabel, strong && s.rowLabelStrong]}>{label}</Text>
      <Text style={[s.rowValue, strong && s.rowValueStrong, tone === 'warn' && s.warn, tone === 'good' && s.good]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: Colors.white },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  gaugeText: { flex: 1 },
  gapNote: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary, paddingHorizontal: Spacing.md, paddingTop: 4 },
  targetRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.md },
  heroLine: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  ours: { color: Colors.textSecondary, fontSize: 13 },
  pct: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  pctSub: { fontSize: 13, color: Colors.textPrimary, marginTop: -2 },
  band: { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginTop: 3 },
  sums: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, borderTopWidth: 1, borderTopColor: Colors.border },
  rowLabel: { fontSize: 13, color: Colors.textPrimary, flex: 1 },
  rowLabelStrong: { fontWeight: '700' },
  rowValue: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  rowValueStrong: { fontWeight: '800' },
  warn: { color: Colors.amber },
  good: { color: Colors.primaryDeep },
  bridge: { fontSize: Typography.sizes.sm, lineHeight: 19, color: Colors.textPrimary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  b: { fontWeight: '800' },
  lever: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  leverLabel: { fontSize: 13, color: Colors.textPrimary, flex: 1 },
  leverPts: { fontSize: 15, fontWeight: '800', color: Colors.primaryDeep, fontVariant: ['tabular-nums'] },
});

