// "CAN I SPEND MORE?" — the retiree's decision row, answered in place.
//
// Founder-approved 2026-08-14 (mock frames B and C), after he called the first version "too complex
// for a user to understand, particularly someone with no finance background."
//
// THE ANSWER COMES FIRST, and it is free money. Everything else on this row is optional detail for
// someone who wants to push further. Words deliberately absent: draw · odds · held at · floor.
// Words kept: spend, month, lasts, runs out — all four are words she uses in conversation.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from './useMoney';
import { spendMoreState, spendMoreSentence } from '../domain/planning/spendMore';
import type { RetirementInputs } from '../domain/retirement';

const STEP = 500;

export function SpendMoreControl({ inputs, maxExtra, horizonAge, onCommit }: {
  inputs: RetirementInputs;
  /** the most she could add — what the paycheck engine already says she has room for */
  maxExtra: number;
  horizonAge: number;
  onCommit?: (newMonthlySpend: number) => void;
}) {
  const [extra, setExtra] = useState(0);
  const state = useMemo(() => spendMoreState(inputs, maxExtra, STEP), [inputs, maxExtra]);
  const said = useMemo(
    () => spendMoreSentence(inputs, extra, horizonAge, state.oddsToday),
    [inputs, extra, horizonAge, state.oddsToday],
  );

  const today = inputs.retire_monthly_spend_today;
  const total = today + extra;
  const clamp = (n: number) => Math.max(0, Math.min(maxExtra, n));

  return (
    <View style={s.wrap} testID="spend-more">
      <Text style={s.q}>Can I spend more?</Text>

      {/* THE ANSWER, FIRST — and it is the free room, which the old static label hid entirely */}
      {state.freeExtra > 0 ? (
        <>
          <Text style={s.answer}>Yes — about {maskedMoney(state.freeExtra)} a month more, and nothing changes.</Text>
          <Text style={s.answerSub}>
            You spend <Text style={s.b}>{maskedMoney(today)}</Text> a month now. At{' '}
            <Text style={s.b}>{maskedMoney(today + state.freeExtra)}</Text> your money still lasts past {horizonAge},
            exactly as it does today.
          </Text>
        </>
      ) : (
        <Text style={s.answer}>Not without it changing how long your money lasts.</Text>
      )}

      <View style={s.stepRow}>
        <Text style={s.stepLabel}>Spend extra</Text>
        <View style={s.stepper}>
          <TouchableOpacity style={s.btn} onPress={() => setExtra(clamp(extra - STEP))}
            accessibilityRole="button" accessibilityLabel="Spend less extra" disabled={extra <= 0}>
            <Text style={[s.btnTxt, extra <= 0 && s.btnOff]}>−</Text>
          </TouchableOpacity>
          <Text style={s.amt} accessibilityLabel={`Spending ${spokenMoney(extra)} extra a month`}>{maskedMoney(extra)}</Text>
          <TouchableOpacity style={s.btn} onPress={() => setExtra(clamp(extra + STEP))}
            accessibilityRole="button" accessibilityLabel="Spend more extra" disabled={extra >= maxExtra}>
            <Text style={[s.btnTxt, extra >= maxExtra && s.btnOff]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* AT ZERO THIS IS NOT A RESULT — it is what she already spends, and the first draft pointed an
          arrow at it as though a decision had been made. It says so plainly now. */}
      <Text style={s.total}>
        {extra === 0
          ? <>You'd spend <Text style={s.b}>{maskedMoney(total)}</Text> a month — the same as now.</>
          : <>You'd spend <Text style={s.b}>{maskedMoney(total)}</Text> a month{extra >= maxExtra ? ' — the most your income and savings can cover.' : '.'}</>}
      </Text>

      <View style={[s.verdict, said.tone === 'edge' ? s.vEdge : said.tone === 'watch' ? s.vWatch : s.vClear]}>
        <Text style={s.verdictTxt} accessibilityLabel={said.text}>
          {said.tone === 'clear' ? '✓ ' : said.tone === 'edge' ? '⚠ ' : ''}{said.text}
        </Text>
      </View>

      {onCommit && extra > 0 && (
        <TouchableOpacity style={s.use} onPress={() => onCommit(total)} accessibilityRole="button"
          accessibilityLabel={`Use as my plan — spending ${spokenMoney(total)} a month`}>
          <Text style={s.useTxt}>Use as my plan</Text>
        </TouchableOpacity>
      )}

      {/* THE ONE SENTENCE THE ROW WAS MISSING. She was expected to work out that spending more and
          taking more from savings are the same act for her — obvious to us, invisible to her. */}
      <Text style={s.foot}>Your Social Security and pension don't change, so anything extra comes out of savings.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 8 },
  q: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  answer: { fontSize: 20, fontWeight: '800', color: Colors.primaryDeep, lineHeight: 27 },
  answerSub: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary },
  b: { fontWeight: '800', color: Colors.textPrimary },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  stepLabel: { fontSize: 13, color: Colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  btnOff: { color: Colors.textTertiary },
  amt: { fontSize: 17, fontWeight: '800', minWidth: 66, textAlign: 'center', color: Colors.textPrimary },
  total: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary },
  verdict: { borderRadius: Radii.md, paddingHorizontal: 11, paddingVertical: 9 },
  vClear: { backgroundColor: Colors.primaryLight },
  vWatch: { backgroundColor: Colors.bgTertiary },
  vEdge: { backgroundColor: Colors.amberLight },
  verdictTxt: { fontSize: 13, lineHeight: 19, color: Colors.textPrimary },
  use: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  useTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  foot: { fontSize: 11, lineHeight: 17, color: Colors.textSecondary },
});
