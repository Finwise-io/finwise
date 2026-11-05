// THE SHEET'S ✕ — the visible way out besides the backdrop tap, one component for every sheet (moved out of MoneySheets on
// 2026-11-04, his Build 55 feedback on the Add a bond sheet: "cannot go back"). Sits top-right, above the sheet's scroll.
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../utils/theme';

export function SheetClose({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onPress}
      style={s.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={s.closeTxt}>✕</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  closeBtn: { position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.bgTertiary, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  closeTxt: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
});
