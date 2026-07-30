// Build-47 walk row 12 (audit Home·NW #7): the "Balances hidden" banner shows on EVERY money tab,
// not just Home — one component, the approved wording, gated on the store's eye toggle.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';

export function HiddenBalancesBanner() {
  const hidden = useStore((s) => s.hideBalances);
  if (!hidden) return null;
  return <Text style={s.banner}>Balances hidden — tap the eye to show</Text>;
}

const s = StyleSheet.create({
  banner: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, backgroundColor: Colors.bgTertiary,
    borderRadius: Radii.md, paddingVertical: 6, paddingHorizontal: 10, marginBottom: Spacing.sm, overflow: 'hidden' },
});
