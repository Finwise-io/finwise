// THE OUTCOME — the answer at the top of the Plan tab (founder-approved 2026-08-12).
//
// ONE score on this screen: the odds. Everything else is arithmetic.
// The Claude Design handoff drew a second gauge — assets against a target — and building the engine
// proved why it could not stay: progress compares ONE future (the middle one) against a threshold,
// while the odds count how many of the 400 futures lasted. A person can be 80% of the way along the
// middle path with 31% odds, because the spread is wide. Two proportional shapes side by side would
// have shown "mostly there" beside "probably not", and the eye believes the shape. So the money is
// money: three lines that subtract to each other, with the shortfall carrying the weight.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from '../utils/theme';
import { GaugeArc } from './GaugeArc';
import { SectionBand } from './SectionBand';
import { InfoDot } from './UI';
import { maskedMoney, spokenMoney } from './useMoney';
import { planTarget, leverDeltas, TARGET_ODDS } from '../domain/planning/target';
import { oddsLine } from '../domain/planning/hub';
import type { RetirementInputs } from '../domain/retirement';

export function PlanOutcome({ inputs, chance, band, horizonAge, retireAge, annualIncome, roomAnnual, lens }: {
  inputs: RetirementInputs | null;
  chance: number;
  band: { low: number; high: number } | null;
  horizonAge: number;
  retireAge: number;
  annualIncome?: number;
  roomAnnual?: number;
  lens: 'retired' | string;
}) {
  // the solves are ~a quarter-second of simulation — never on a render, only when a number moves
  const t = useMemo(() => (inputs ? planTarget(inputs, annualIncome, roomAnnual) : null), [inputs, annualIncome, roomAnnual]);
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
      <SectionBand
        title={lens === 'retired' ? 'IS MY MONEY LASTING?' : 'WILL MY MONEY LAST?'}
        value="ESTIMATE"
      />

      {/* the one score */}
      <View style={s.gaugeRow} accessible
        accessibilityLabel={`${lens === 'retired' ? 'Is my money lasting' : 'Will my money last'}: ${oddsLine(lens, chance, horizonAge)}, an estimate${band ? `. In the worst markets ${band.low} percent, in the best ${band.high} percent` : ''}.`}>
        <GaugeArc pct={chance} />
        <View style={s.gaugeText}>
          <Text style={s.pct}>{chance}%</Text>
          <Text style={s.pctSub}>odds of lasting to age {horizonAge}</Text>
          {band && <Text style={s.band}>range {band.low}–{band.high}% across bad-to-good markets</Text>}
        </View>
        <InfoDot term="nestEggMath" />
      </View>

      {/* THE ARITHMETIC — money, not a second score. Not for someone already drawing down: a target is
          a "will I get there" framing, and once you are retired the question is "is this covering me",
          which the paycheck answers. Adopted when the design handoff came in and confirmed by the
          founder 2026-08-13; it had never been built, so a retiree saw a target pot AND two different
          "to spare" figures four lines apart (audit D8). */}
      {!retired && t?.targetAtRetirement != null && (
        <View style={s.sums}>
          <Row label={`On track for${lens === 'retired' ? '' : `, at ${retireAge}`}`} value={maskedMoney(t.projectedAtRetirement)} spoken={spokenMoney(t.projectedAtRetirement)} />
          <Row label="Target nest egg" value={maskedMoney(t.targetAtRetirement)} spoken={spokenMoney(t.targetAtRetirement)} />
          {agrees && <Row
            label={spare ? 'More than you need' : 'Short'}
            value={maskedMoney(Math.abs(short!))}
            spoken={spokenMoney(Math.abs(short!))}
            strong
            tone={spare ? 'good' : 'warn'}
          />}
        </View>
      )}

      {/* THE BRIDGE — the most actionable line on the screen, and also a "reach a target by saving"
          sentence, so it stands down for a retiree along with the target itself. June was being told
          "nothing more to put away to stay there" about a plan she is no longer paying into. */}
      {!retired && t && !t.impossible && !t.alreadyThere && t.requiredExtraAnnual ? (
        <Text style={s.bridge}>
          Adding <Text style={s.b}>{maskedMoney(t.requiredExtraAnnual)}</Text> a year closes it
          {t.yearsToRetire > 0 ? ` over your ${t.yearsToRetire} years to ${retireAge}` : ''} and raises your odds to {TARGET_ODDS}%.
          {roomAnnual ? ` ${maskedMoney(Math.min(roomAnnual, t.requiredExtraAnnual))} of that fits in tax-advantaged room.` : ''}
        </Text>
      ) : null}

      {!retired && t?.alreadyThere && (
        <Text style={s.bridge}>You've cleared the {TARGET_ODDS}% mark — nothing more to put away to stay there.</Text>
      )}

      {/* the honest bad state: say the number once, then turn to what actually moves */}
      {t?.impossible && (
        <>
          <Text style={s.bridge}>
            {t.requiredExtraAnnual != null
              ? <>Reaching {TARGET_ODDS}% by saving alone would take <Text style={s.b}>{maskedMoney(t.requiredExtraAnnual)} a year</Text> — more than you earn. That number is real. Here's what actually moves it:</>
              : <>Saving alone cannot reach {TARGET_ODDS}% from here. That is real. Here's what actually moves it:</>}
          </Text>
          <SectionBand title="WHAT ACTUALLY MOVES IT" />
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
