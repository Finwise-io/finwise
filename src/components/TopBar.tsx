// Blend nav top bar: ☰ Menu (grid of every module) on the left, Net Worth chip on the right.
// Rendered as the shared header for all bottom-tab screens.
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { buildSnapshot } from '../domain/snapshot';
import { buildAssetsState } from '../domain/assets';
import { buildDebtState } from '../domain/debt';
import { buildNetWorth } from '../domain/networth';

type Mod = { e: string; t: string; route?: string; soon?: boolean };
const MODULES: Mod[] = [
  { e: '💎', t: 'Net Worth', route: '/(tabs)/analytics' },
  { e: '🏖', t: 'Retirement', route: '/(tabs)/retirement' },
  { e: '🎯', t: 'Goals', route: '/(tabs)/goals' },
  { e: '🔮', t: 'Scenarios', soon: true },
  { e: '💡', t: 'Insights', soon: true },
  { e: '🏅', t: 'Rewards', route: '/(tabs)/rewards' },
  { e: '📚', t: 'Tips', route: '/(tabs)/tips' },
  { e: '⚙️', t: 'Settings', route: '/(tabs)/settings' },
  { e: '🔗', t: 'Link bank', soon: true },
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
  const nw = useMemo(() => {
    if (assets.length || liabs.length) {
      return buildNetWorth(uid, buildAssetsState(uid, assets).total_asset_value, buildDebtState(uid, liabs).total_debt_balance).net_worth;
    }
    return op ? buildSnapshot(uid, op, { inflationRate: store.inflationRate ?? 2.4, treasuryYield: store.treasuryYield ?? 4.3 }).networth.net_worth : 0;
  }, [assets, liabs, op]);

  const go = (m: Mod) => {
    setMenu(false);
    if (m.soon || !m.route) { setTimeout(() => Alert.alert(m.t, 'Coming soon.'), 180); return; }
    router.push(m.route as any);
  };

  return (
    <View style={[s.bar, { paddingTop: insets.top + 6 }]}>
      <TouchableOpacity onPress={() => setMenu(true)} hitSlop={hit} style={s.menuBtn}><Ionicons name="grid" size={20} color={Colors.textSecondary} /></TouchableOpacity>
      <TouchableOpacity style={s.nwChip} onPress={() => router.push('/(tabs)/analytics')}>
        <Ionicons name="trending-up" size={13} color="#fff" style={{ marginRight: 5 }} />
        <Text style={s.nwTxt}>{money(nw)}</Text>
        <Ionicons name="chevron-forward" size={13} color="#BEE7D8" style={{ marginLeft: 2 }} />
      </TouchableOpacity>

      <Modal visible={menu} transparent animationType="slide" onRequestClose={() => setMenu(false)}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setMenu(false)}>
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            <View style={s.grip} />
            <Text style={s.sTitle}>All modules</Text>
            <View style={s.grid}>
              {MODULES.map((m) => (
                <TouchableOpacity key={m.t} style={s.gi} onPress={() => go(m)}>
                  <Text style={s.giE}>{m.e}</Text>
                  <Text style={s.giT}>{m.t}</Text>
                  {m.soon && <Text style={s.giLk}>Soon</Text>}
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
  menuBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nwChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryDark, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
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
