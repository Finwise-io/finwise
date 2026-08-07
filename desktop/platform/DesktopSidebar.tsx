// DESKTOP shell (mock shell-home-plan-desktop-v1, founder-approved 2026-08-03): the five surfaces
// as a left sidebar — built from the SAME TAB_META map as the phone's bottom bar, so they can never
// drift. Foot: the long-tail + Hide balances + Sign out (shared-computer safety, desktop UX rules).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useSegments } from 'expo-router';
import { Colors } from '../../src/utils/theme';
import { TAB_META } from '../../src/constants/tabs';
import type { FccTab } from '../../src/domain/profile/lens';
import { useStore } from '../../src/store/useStore';

const FOOT: { icon: string; label: string; route?: string }[] = [
  { icon: '💡', label: 'Insights', route: '/insights' },
  { icon: '🧾', label: 'Tax organizer', route: '/tax-organizer' },
  { icon: '🎓', label: 'College planner', route: '/education' },
  { icon: '🎁', label: 'Estate & legacy', route: '/estate' },
];

export function DesktopSidebar({ order }: { order: FccTab[] }) {
  const segments = useSegments() as string[];
  const store = useStore() as any;
  const active = segments[segments.length - 1];
  return (
    <View style={s.side}>
      <View style={s.brand}>
        <View style={s.kmark}><Text style={s.kmarkT}>K</Text></View>
        <Text style={s.brandT}>MoneyKeel</Text>
      </View>
      <View style={s.nav}>
        {order.map((tab) => {
          const on = active === tab;
          return (
            <TouchableOpacity key={tab} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${TAB_META[tab].title} tab`}
              style={[s.item, on && s.itemOn]} onPress={() => router.push(`/(tabs)/${tab}` as any)}>
              <Text style={[s.itemT, on && s.itemTOn]}>{TAB_META[tab].title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={s.foot}>
        {FOOT.map((f) => (
          <TouchableOpacity key={f.label} accessibilityRole="button" accessibilityLabel={f.label}
            style={s.footItem} onPress={() => f.route && router.push(f.route as any)}>
            <Text style={s.footT}>{f.icon}  {f.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={store.hideBalances ? 'Show balances' : 'Hide balances'}
          style={s.footItem} onPress={() => store.setHideBalances?.(!store.hideBalances)}>
          <Text style={s.footT}>👁  {store.hideBalances ? 'Show balances' : 'Hide balances'}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign out"
          style={s.footItem} onPress={() => store.signOut?.()}>
          <Text style={s.footT}>↪  Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  side: { width: 228, backgroundColor: Colors.primaryDeep, paddingVertical: 18, height: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
  kmark: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  kmarkT: { color: Colors.white, fontWeight: '900', fontSize: 17 },
  brandT: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  nav: { paddingHorizontal: 10, paddingTop: 12, gap: 2 },
  item: { borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  itemOn: { backgroundColor: Colors.primary },
  itemT: { color: Colors.primaryMid, fontSize: 15, fontWeight: '600' },
  itemTOn: { color: Colors.white, fontWeight: '800' },
  foot: { marginTop: 'auto', paddingHorizontal: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  footItem: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', borderRadius: 8 },
  footT: { color: Colors.primaryMid, fontSize: 13, fontWeight: '600' },
});
