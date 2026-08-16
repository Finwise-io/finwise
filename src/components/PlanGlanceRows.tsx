// THE SEVEN QUESTIONS — shown ALWAYS, including on day one (founder finding, 2026-08-14).
//
// The design showed three rows on day one and seven everywhere else. The founder asked where the
// other four went, and the answer is worse than an inconsistency: FOUR OF THEM ARE NOT BLANK, THEY
// ARE OURS. With nothing answered the app still assumes retire at 65, plan to 90, a 6% return and
// 2.5% inflation — and the sample gauge on that same frame is computed with them. Hiding the rows
// hides the assumptions the number on screen is standing on, which is exactly what §7.2 forbids:
// label the numbers, do not footnote the screen.
//
// So: seven rows always. Unanswered ones say "Add ›". Assumed ones show the value with a quiet
// "ours" tag. A person sees the whole shape of what they are being asked AND which parts we filled
// in on their behalf.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney } from './useMoney';

export interface GlanceRow {
  key: string;
  question: string;
  /** what to show on the right: a value, or null when we are waiting on them */
  value: string | null;
  /** true when the value is the app's own assumption rather than their answer */
  ours?: boolean;
  /** the wording for the missing case — "Add" for a typed answer, "Link" for accounts */
  cta?: 'Add' | 'Link';
  onPress?: () => void;
}

/** The seven, in the founder's order and his grammar — every one a question, none a parameter. */
export function buildGlanceRows(args: {
  age: number | null; retireAge: number | null; horizonAge: number | null;
  spendMonthly: number | null; targetNestEgg: number | null;
  counted: number | null; bigCosts: number | null;
  defaults: { retireAge: number; horizonAge: number };
  onOpen?: (key: string) => void;
}): GlanceRow[] {
  const { age, retireAge, horizonAge, spendMonthly, targetNestEgg, counted, bigCosts, defaults, onOpen } = args;
  const press = (k: string) => (onOpen ? () => onOpen(k) : undefined);
  return [
    { key: 'age',    question: 'How old are you?', value: age != null ? String(age) : null, cta: 'Add', onPress: press('age') },
    // ASSUMED, and said to be: the sample gauge above is computed with these two
    { key: 'retire', question: 'When do you want to retire?', value: String(retireAge ?? defaults.retireAge), ours: retireAge == null, onPress: press('retire') },
    { key: 'horizon', question: 'How long should the money last?', value: String(horizonAge ?? defaults.horizonAge), ours: horizonAge == null, onPress: press('horizon') },
    { key: 'spend',  question: 'What will you spend each month in retirement?', value: spendMonthly ? maskedMoney(spendMonthly) : null, cta: 'Add', onPress: press('spend') },
    { key: 'target', question: "What's your target nest egg?", value: targetNestEgg ? maskedMoney(targetNestEgg) : null, cta: 'Add', onPress: press('target') },
    { key: 'counts', question: 'What counts toward retirement?', value: counted ? maskedMoney(counted) : null, cta: 'Link', onPress: press('counts') },
    // "None" is an answer, not a fake zero — nobody is being told they have nothing
    { key: 'costs',  question: 'What big one-time costs are coming?', value: bigCosts ? maskedMoney(bigCosts) : 'None', onPress: press('costs') },
  ];
}

export function PlanGlanceRows({ rows }: { rows: GlanceRow[] }) {
  return (
    <View style={s.card} testID="plan-glance-rows">
      {rows.map((r, i) => {
        const missing = r.value == null;
        const body = (
          <>
            <Text style={[s.q, missing && s.qMissing]}>{r.question}</Text>
            {missing ? (
              <Text style={s.add}>{r.cta ?? 'Add'} ›</Text>
            ) : (
              <View style={s.valueWrap}>
                <Text style={s.value}>{r.value}</Text>
                {/* the quiet tag that makes an assumption visible instead of silently ours */}
                {r.ours && <Text style={s.ours}>ours</Text>}
              </View>
            )}
          </>
        );
        // spoken as ONE sentence either way — a screen reader meeting "When do you want to retire?"
        // and "65" and "ours" as three fragments learns nothing about which of them is our guess
        const spoken = `${r.question} ${missing
          ? `not answered yet, tap to ${(r.cta ?? 'add').toLowerCase()}`
          : `${r.value}${r.ours ? ', our assumption until you change it' : ''}`}`;
        return r.onPress ? (
          <TouchableOpacity key={r.key} style={[s.row, i > 0 && s.divider, missing && s.rowMissing]}
            onPress={r.onPress} accessibilityRole="button" accessibilityLabel={spoken}>
            {body}
          </TouchableOpacity>
        ) : (
          <View key={r.key} style={[s.row, i > 0 && s.divider, missing && s.rowMissing]}
            accessible accessibilityLabel={spoken}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, minHeight: 44, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  // amber marks WHAT NEEDS DOING. The "ours" tag deliberately does NOT use it — on day one the
  // design had amber meaning both "act on this" and "this is our assumption, nothing is wrong".
  rowMissing: { backgroundColor: Colors.amberLight },
  q: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  qMissing: { fontWeight: '700' },
  add: { fontSize: 15, fontWeight: '700', color: Colors.amber },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  value: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  ours: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
});
