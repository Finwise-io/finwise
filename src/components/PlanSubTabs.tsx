// PLAN'S THREE SUB-TABS — Retire · Goals · Prepare (founder ruling, 2026-08-02; drawn v4).
//
// Plan keeps its name and gains three sub-tabs. The split is LOPSIDED ON PURPOSE: Retire is the
// whole redesign, while Goals and Prepare gather screens that already exist under honest names.
// Prepare in particular is mostly a rename — the Goals screen quietly linked credit, college,
// estate, insurance and the tax organiser already, so this names an accidental hub rather than
// inventing information architecture.
//
// The bar is CHROME, not content: it sits on every frame including day-one and age-missing, so a
// person can always reach the other two. Without it, every screen silently claims Plan has one page.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../utils/theme';

export type PlanSubTab = 'retire' | 'goals' | 'prepare';
export const PLAN_SUB_TABS: { key: PlanSubTab; title: string }[] = [
  { key: 'retire',  title: 'Retire' },
  { key: 'goals',   title: 'Goals' },
  { key: 'prepare', title: 'Prepare' },
];

export function PlanSubTabs({ active, onChange }: { active: PlanSubTab; onChange: (t: PlanSubTab) => void }) {
  return (
    <View style={s.bar} accessibilityRole="tablist" testID="plan-subtabs">
      {PLAN_SUB_TABS.map((t) => {
        const on = t.key === active;
        return (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, on && s.tabOn]}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.title}${on ? ', selected' : ''}`}
          >
            {/* the selected tab carries weight AND an underline — never colour alone (§7) */}
            <Text style={[s.txt, on && s.txtOn]}>{t.title}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: Spacing.md },
  // 44pt minimum, and the whole width is tappable rather than just the word
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: Colors.primaryDeep },
  txt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  txtOn: { fontWeight: '800', color: Colors.primaryDeep },
});
