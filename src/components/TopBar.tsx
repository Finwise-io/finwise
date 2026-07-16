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
import { resolveLens, tabOrder, type FccTab } from '../domain/profile/lens';
import { TAB_META } from '../constants/tabs';

type Mod = { e: string; t: string; route?: string };
// Menu = a MIRROR of the tab bar (founder UX review 2026-07-16: "hard to link menu to button
// bar"). The strip on top IS the five tabs — same icons, same lens order as the bottom bar —
// and every deeper destination is grouped under the tab it lives in ("More in …"). Pages that
// belong to no tab sit under Tools & check-ups. App utilities (Rewards / Tips / Settings) sit
// in a compact footer — that's their only entry point, so they must stay reachable.
const MORE_IN: { tab: FccTab; items: Mod[] }[] = [
  { tab: 'cashflow', items: [
    { e: '🪣', t: 'Budget', route: '/(tabs)/budget' },
    { e: '💵', t: 'Income', route: '/income-manager' },
    { e: '💸', t: 'Expenses', route: '/expense' },
    { e: '🗓️', t: 'Bill calendar', route: '/bill-calendar' },
  ] },
  { tab: 'plan', items: [
    { e: '🏖', t: 'Retirement', route: '/(tabs)/retirement' },
    { e: '🎯', t: 'Goals', route: '/(tabs)/goals' },
    { e: '🎓', t: 'College planner', route: '/education' },
    { e: '🌪', t: 'Stress test', route: '/stress-test' },
    { e: '🔁', t: 'Roth conversion', route: '/roth' },
  ] },
];
const TOOLS: Mod[] = [
  { e: '💡', t: 'Insights', route: '/insights' },
  { e: '🧾', t: 'Tax organizer', route: '/tax-organizer' },
  { e: '🛡️', t: 'Insurance check', route: '/insurance' },
  { e: '💳', t: 'Build credit', route: '/credit' },
  { e: '🎁', t: 'Estate & legacy', route: '/estate' },
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
  // same resolver + order the bottom bar uses — the strip mirrors it exactly
  const order = tabOrder(resolveLens(store.onboardingProfile, store.lensOverride));

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
            <Text style={s.sTitle}>Everything in MoneyKeel</Text>
            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator>
              {/* the five tabs — the same icons, in the same order as the bar at the bottom */}
              <View style={s.groupHdrRow}><Text style={s.groupHdr}>YOUR FIVE TABS — same order as the bar below</Text></View>
              <View style={s.tabStrip}>
                {order.map((name) => (
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Go to ${TAB_META[name].title}`}
                    key={name} style={s.tabCell} onPress={() => go({ e: '', t: TAB_META[name].title, route: `/(tabs)/${name}` })}>
                    <Ionicons name={`${TAB_META[name].icon}-outline` as any} size={20} color={Colors.primaryDark} />
                    <Text style={s.tabCellTxt} numberOfLines={1}>{TAB_META[name].title}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* everything deeper, grouped under the tab it lives in */}
              {MORE_IN.map((g) => (
                <View key={g.tab}>
                  <View style={s.groupHdrRow}>
                    <Ionicons name={`${TAB_META[g.tab].icon}-outline` as any} size={12} color={Colors.textSecondary} />
                    <Text style={s.groupHdr}>MORE IN {TAB_META[g.tab].title.toUpperCase()}</Text>
                  </View>
                  <View style={s.grid}>
                    {g.items.map((m) => (
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel={m.t} key={m.t} style={s.gi} onPress={() => go(m)}>
                        <Text style={s.giE}>{m.e}</Text>
                        <Text style={s.giT} numberOfLines={2}>{m.t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}

              <View style={s.groupHdrRow}><Text style={s.groupHdr}>TOOLS & CHECK-UPS</Text></View>
              <View style={s.grid}>
                {TOOLS.map((m) => (
                  <TouchableOpacity key={m.t} style={s.gi} onPress={() => go(m)} accessibilityRole="button" accessibilityLabel={m.t}>
                    <Text style={s.giE}>{m.e}</Text>
                    <Text style={s.giT} numberOfLines={2}>{m.t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
  groupHdr: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.5 },
  groupHdrRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.md + 2, marginBottom: Spacing.sm },
  tabStrip: { flexDirection: 'row', gap: 7 },
  tabCell: { flex: 1, minHeight: 62, backgroundColor: Colors.cardBg, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 2 },
  tabCellTxt: { fontSize: 9.5, fontWeight: '800', color: Colors.primaryDark, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  gi: { width: '22.7%', minHeight: 70, backgroundColor: Colors.cardBg, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  giE: { fontSize: 22 },
  giT: { fontSize: 10, fontWeight: '700', color: Colors.textPrimary, marginTop: 4, textAlign: 'center', lineHeight: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  footerE: { fontSize: 15 },
  footerT: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
});
