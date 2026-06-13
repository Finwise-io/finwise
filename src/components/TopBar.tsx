// Blend nav top bar: ☰ Menu (grid of every module) on the left, Net Worth chip on the right.
// Rendered as the shared header for all bottom-tab screens.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { buildAssetsState } from '../domain/assets';
import { buildDebtState } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';
import { resolveNetWorthRows } from '../domain/snapshot';

type Mod = { e: string; t: string; route?: string; soon?: boolean };
// Every tile must open a REAL screen — no "coming soon" placeholders in the hub.
const MODULES: Mod[] = [
  { e: '💎', t: 'Net Worth', route: '/(tabs)/analytics' },
  { e: '🏖', t: 'Retirement', route: '/(tabs)/retirement' },
  { e: '🪣', t: 'Budget', route: '/(tabs)/budget' },
  { e: '🎯', t: 'Plan', route: '/(tabs)/goals' },
  { e: '💡', t: 'Insights', route: '/insights' },
  { e: '📈', t: 'Invest', route: '/(tabs)/invest' },
  { e: '🗓️', t: 'Bill calendar', route: '/bill-calendar' },
  { e: '🌪', t: 'Stress test', route: '/stress-test' },
  { e: '💵', t: 'Income', route: '/income-manager' },
  { e: '💸', t: 'Expenses', route: '/expense' },
  { e: '💳', t: 'Build credit', route: '/credit' },
  { e: '🎓', t: 'College planner', route: '/education' },
  { e: '🛡️', t: 'Insurance check', route: '/insurance' },
  { e: '🧾', t: 'Tax organizer', route: '/tax-organizer' },
  { e: '🔁', t: 'Roth conversion', route: '/roth' },
  { e: '🎁', t: 'Estate & legacy', route: '/estate' },
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
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';
  const assets = store.assetAccounts ?? [];
  const liabs = store.liabilities ?? [];
  // B-49: net worth from the SAME rows Home + the Net Worth screen use (resolveNetWorthRows), via the
  // same buildNetWorth math — so the chip always agrees with them. Computed directly (not via
  // buildSnapshot) so the always-mounted header doesn't run the retirement Monte-Carlo for one number.
  const nw = useMemo(
    () => {
      const { accounts, liabilities } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, assets, liabs);
      return buildNetWorth(uid, buildAssetsState(uid, accounts).total_asset_value, buildDebtState(uid, liabilities).total_debt_balance).net_worth;
    },
    [assets, liabs, op, uid, store.nwSeeded],
  );

  const go = (m: Mod) => {
    setMenu(false);
    if (m.soon || !m.route) { setTimeout(() => Alert.alert(m.t, 'Coming soon.'), 180); return; }
    router.push(m.route as any);
  };

  return (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => setMenu(true)} hitSlop={hit} style={s.menuBtn}>
        <Ionicons name="grid" size={16} color={Colors.textSecondary} />
        <Text style={s.menuTxt}>Menu</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.nwChip} onPress={() => router.push('/(tabs)/analytics')}>
        <Text style={s.nwLabel}>NW</Text>
        <Ionicons name="trending-up" size={13} color="#BEE7D8" style={{ marginRight: 5 }} />
        <Text style={s.nwTxt}>{money(nw)}</Text>
        <Ionicons name="chevron-forward" size={13} color="#BEE7D8" style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setMenu(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.grip} />
            <Text style={s.sTitle}>All modules</Text>
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <View style={s.grid}>
                {MODULES.map((m) => (
                  <TouchableOpacity key={m.t} style={s.gi} onPress={() => go(m)}>
                    <Text style={s.giE}>{m.e}</Text>
                    <Text style={s.giT}>{m.t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: 10, backgroundColor: Colors.bgSecondary },
  menuBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 13, borderRadius: 19, backgroundColor: Colors.cardBg, justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  menuTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  nwChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryDark, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  nwLabel: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginRight: 5 },
  nwTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, paddingBottom: 32 },
  grip: { width: 38, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  sTitle: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gi: { width: '31%', backgroundColor: Colors.cardBg, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  giE: { fontSize: 24 },
  giT: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, marginTop: 5 },
  giLk: { fontSize: 9, color: Colors.textTertiary, marginTop: 1 },
});
