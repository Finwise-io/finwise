// GOALS — everything a person saves for other than retiring (brief §3.0.1, drawn in handoff v4).
//
// "Can I afford it all?" is promoted to the FRONT DOOR because with more than one goal that is the
// real question — today it is buried behind will-it-last. The goals themselves follow, then college.
//
// The empty state matters more here than anywhere on this surface: most people arrive with no goals
// set, so this is the first thing they see. It is an on-ramp, never a paragraph about what the
// screen will one day do (§7).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii } from '../utils/theme';
import { SectionBand } from './SectionBand';
import { maskedMoney, spokenMoney } from './useMoney';

export interface GoalRow { id: string; label: string; target: number; saved: number; targetDate?: string | null; onTrack?: boolean | null }

export function PlanGoals({ goals }: { goals: GoalRow[] }) {
  const router = useRouter();
  const active = goals.filter((g) => g.saved < g.target);

  return (
    <View testID="plan-goals">
      {active.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Nothing here yet</Text>
          {/* names what a goal IS, in her words — a person who has never set one does not know */}
          <Text style={s.emptyBody}>
            A goal is anything you're putting money aside for: a car, a wedding, helping a grandchild.
          </Text>
          <TouchableOpacity style={s.cta} onPress={() => router.push('/(tabs)/goals')} accessibilityRole="button"
            accessibilityLabel="Add a goal">
            <Text style={s.ctaTxt}>+ Add a goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <SectionBand quiet title="WHAT YOU'RE SAVING FOR" />
          <View style={s.card}>
            {/* the front door: with more than one goal, "can I afford them together" IS the question */}
            <TouchableOpacity style={s.row} onPress={() => router.push('/multi-goal')} accessibilityRole="button"
              accessibilityLabel="Can I afford it all? Your goals weighed together, not one at a time.">
              <Text style={s.title}>Can I afford it all?</Text>
              <Text style={s.sub}>{active.length > 1 ? 'all of them together, not one at a time' : 'weighed against everything else'}</Text>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
            {active.map((g) => (
              <TouchableOpacity key={g.id} style={[s.row, s.divider]} onPress={() => router.push('/(tabs)/goals')}
                accessibilityRole="button"
                accessibilityLabel={`${g.label} — ${spokenMoney(g.target)}${g.targetDate ? ` by ${g.targetDate}` : ''}`}>
                <Text style={s.title}>{g.label}</Text>
                <Text style={s.sub}>
                  {maskedMoney(g.target)}{g.targetDate ? ` by ${g.targetDate}` : ''}
                  {g.onTrack === true ? ' · on track' : g.onTrack === false ? ' · behind' : ''}
                </Text>
                <Text style={s.chev}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.row, s.divider]} onPress={() => router.push('/education')} accessibilityRole="button"
              accessibilityLabel="College planner — what a course of study costs, and what it needs a month">
              <Text style={s.title}>College planner</Text>
              <Text style={s.sub}>what a course of study costs, and what it needs a month</Text>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.addRow} onPress={() => router.push('/(tabs)/goals')} accessibilityRole="button"
            accessibilityLabel="Add a goal">
            <Text style={s.addTxt}>+ Add a goal</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, minHeight: 44, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, maxWidth: 170, textAlign: 'right' },
  chev: { fontSize: 15, color: Colors.textTertiary },
  addRow: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md, marginTop: 2 },
  addTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDeep },
  empty: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.lg, alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  emptyBody: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  cta: { backgroundColor: Colors.primaryDeep, borderRadius: Radii.md, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
