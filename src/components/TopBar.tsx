// Top bar (FCC M4, decided 2026-07-12): ☰ Menu (the long-tail escape hatch) on the left; the right
// keeps only MODES — hide-balances eye + settings gear. The net-worth chip is REMOVED (it duplicated
// Home's line and the Net worth tab). Rendered as the shared header for all bottom-tab screens.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Colors, Spacing } from '../utils/theme';

type Mod = { e: string; t: string; route?: string };
// Menu shows the 4 intent groups (near→far horizon). App utilities (Rewards / Tips / Settings)
// sit in a compact footer — that's their only entry point, so they must stay reachable.
const GROUPS: { section: string; items: Mod[] }[] = [
  { section: 'Everyday money', items: [
    { e: '📊', t: 'Cash flow', route: '/(tabs)/cashflow' },
    { e: '🪣', t: 'Budget', route: '/(tabs)/budget' },
    { e: '💵', t: 'Income', route: '/income-manager' },
    { e: '💸', t: 'Expenses', route: '/expense' },
    { e: '🗓️', t: 'Bill calendar', route: '/bill-calendar' },
  ] },
  { section: 'Track your wealth', items: [
    { e: '💎', t: 'Net worth', route: '/(tabs)/analytics' },
    // T10: this is the "Grow & track" feature (PerformanceScreen) — label it the way onboarding names it
    // so a user who set up "Grow & track" can find it here regardless of which onboarding tracks they picked.
    { e: '📈', t: 'Invest', route: '/(tabs)/invest' },
    { e: '💡', t: 'Insights', route: '/insights' },
  ] },
  { section: 'Plan ahead', items: [
    { e: '🧭', t: 'Plan', route: '/(tabs)/plan' },
    { e: '🏖', t: 'Retirement', route: '/(tabs)/retirement' },
    { e: '🎯', t: 'Goals', route: '/(tabs)/goals' },
    { e: '🎓', t: 'College planner', route: '/education' },
    { e: '🌪', t: 'Stress test', route: '/stress-test' },
  ] },
  { section: 'Protect & optimize', items: [
    { e: '🧾', t: 'Tax organizer', route: '/tax-organizer' },
    { e: '🔁', t: 'Roth conversion', route: '/roth' },
    { e: '🛡️', t: 'Insurance check', route: '/insurance' },
    { e: '💳', t: 'Build credit', route: '/credit' },
    { e: '🎁', t: 'Estate & legacy', route: '/estate' },
  ] },
];
const FOOTER: Mod[] = [
  { e: '💬', t: 'Send feedback', route: '/(tabs)/settings?openFeedback=1' },
  { e: '🏅', t: 'Rewards', route: '/(tabs)/rewards' },
  { e: '📚', t: 'Tips', route: '/(tabs)/tips' },
  { e: '⚙️', t: 'Settings', route: '/(tabs)/settings' },
];
const hit = { top: 10, bottom: 10, left: 10, right: 10 };

export default function TopBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useStore() as any;
  const [menu, setMenu] = useState(false);

  const go = (m: Mod) => {
    setMenu(false);
    if (!m.route) { setTimeout(() => Alert.alert(m.t, 'Coming soon.'), 180); return; }
    router.push(m.route as any);
  };

  return (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity
        onPress={() => setMenu(true)}
        hitSlop={hit}
        style={s.menuBtn}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityHint="Opens all modules"
      >
        <Ionicons name="grid" size={16} color={Colors.textSecondary} />
        <Text style={s.menuTxt}>Menu</Text>
      </TouchableOpacity>
      <Text style={s.brand} accessibilityRole="header">MoneyKeel</Text>
      <View style={s.right}>
        <TouchableOpacity
          onPress={() => store.toggleHideBalances?.()}
          hitSlop={hit}
          style={s.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={store.hideBalances ? 'Show balances' : 'Hide balances'}
          accessibilityHint="Masks every money amount in the app"
        >
          <Ionicons name={store.hideBalances ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/settings')}
          hitSlop={hit}
          style={s.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          accessibilityHint="Opens Settings"
        >
          <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setMenu(false)} accessibilityRole="button" accessibilityLabel="Close menu">
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.grip} />
            <Text style={s.sTitle}>All modules</Text>
            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator>
              {GROUPS.map((g) => (
                <View key={g.section}>
                  <Text style={s.groupHdr}>{g.section}</Text>
                  <View style={s.grid}>
                    {g.items.map((m) => (
                      <TouchableOpacity key={m.t} style={s.gi} onPress={() => go(m)} accessibilityRole="button" accessibilityLabel={m.t}>
                        <Text style={s.giE}>{m.e}</Text>
                        <Text style={s.giT} numberOfLines={2}>{m.t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            {/* footer pinned BELOW the scroll area so Rewards/Tips/Settings are always visible */}
            <View style={s.footerRow}>
              {FOOTER.map((m) => (
                <TouchableOpacity key={m.t} style={s.footerItem} onPress={() => go(m)} accessibilityRole="button" accessibilityLabel={m.t}>
                  <Text style={s.footerE}>{m.e}</Text>
                  <Text style={s.footerT}>{m.t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: 10, backgroundColor: Colors.bgSecondary },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 19, backgroundColor: Colors.cardBg, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { height: 38, width: 38, borderRadius: 19, backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  menuTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  brand: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 0.3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sTitle: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: Spacing.xs },
  groupHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  gi: { width: '22.7%', minHeight: 70, backgroundColor: Colors.cardBg, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  giE: { fontSize: 22 },
  giT: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, marginTop: 4, textAlign: 'center', lineHeight: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  footerE: { fontSize: 15 },
  footerT: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
});
