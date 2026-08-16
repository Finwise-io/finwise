// PREPARE — getting your affairs in order (brief §3.0.1, drawn in handoff v4).
//
// Six things a person mostly does ONCE, which is why the useful state here is "done or not done"
// rather than a number. A row that says "not started" or "done — March 2026" tells someone where
// ten minutes would go; a row that just says "Estate" tells them nothing.
//
// Deliberately lopsided against Retire, and NOT padded for symmetry (founder instruction): these
// are existing screens gathered under an honest name, not new work invented to balance a tab.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii } from '../utils/theme';
import { SectionBand } from './SectionBand';

export interface PrepareItem { key: string; title: string; route: string; doneOn?: string | null }

/** The six, in the order the brief fixed. Order never re-sorts on state — a person who learns where
 *  a row sits finds it there next month (the same rule the decision rows follow). */
export const PREPARE_ROWS: { key: string; title: string; route: string }[] = [
  { key: 'insurance', title: 'Insurance check',            route: '/insurance' },
  { key: 'estate',    title: 'Estate & legacy',            route: '/estate' },
  { key: 'tax',       title: 'Tax organiser',              route: '/tax-organizer' },
  { key: 'credit',    title: 'Build credit',               route: '/credit' },
  { key: 'stress',    title: 'Stress test — a surprise expense', route: '/stress-test' },
  { key: 'jobsafety', title: 'Job safety check',           route: '/jobsafety' },
];

export function PlanPrepare({ status }: { status?: Record<string, string | null | undefined> }) {
  const router = useRouter();
  return (
    <View testID="plan-prepare">
      <SectionBand quiet title="GETTING YOUR AFFAIRS IN ORDER" />
      <View style={s.card}>
        {PREPARE_ROWS.map((r, i) => {
          const done = status?.[r.key];
          return (
            <TouchableOpacity
              key={r.key}
              style={[s.row, i > 0 && s.divider]}
              onPress={() => router.push(r.route as any)}
              accessibilityRole="button"
              accessibilityLabel={`${r.title} — ${done ? `done ${done}` : 'not started'}`}
            >
              <Text style={s.title}>{r.title}</Text>
              {/* "not started" is a fact, not a telling-off — it carries no icon and no red */}
              <Text style={[s.state, !done && s.stateOpen]}>{done ? `done — ${done}` : 'not started'}</Text>
              <Text style={s.chev}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={s.foot}>
        These are mostly things you do once. Nothing here expires — the dates just tell you when you last looked.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: Radii.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, minHeight: 44, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  state: { fontSize: 13, color: Colors.textSecondary },
  stateOpen: { color: Colors.amber, fontWeight: '600' },
  chev: { fontSize: 15, color: Colors.textTertiary },
  foot: { fontSize: 11, lineHeight: 16, color: Colors.textSecondary, marginTop: Spacing.sm, paddingHorizontal: 2 },
});
