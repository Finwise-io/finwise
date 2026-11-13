// "UPDATE MONEYKEEL TO KEEP SAVING" — update-to-keep-saving v01 (2026-11-12, cloud copy R8a): when the cloud's lowest allowed
// version is above this app's, the app's one amber box says so at the top of every tab and of Settings, in the place the
// "Balances hidden" line takes, before it. No ✕: it stays until MoneyKeel is updated, because until then nothing reaches the cloud.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii, Tap } from '../utils/theme';

/** MoneyKeel's App Store page (eas.json submit.ascAppId). */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6773866960';

export function UpdateToKeepSavingBanner() {
  const needed = useStore((s: any) => s.appUpdateNeeded === true);
  if (!needed) return null;
  return (
    <View style={s.box} testID="update-to-keep-saving">
      <Text style={s.head}>⚠ Update MoneyKeel to keep saving</Text>
      <Text style={s.line}>This version of MoneyKeel can no longer save to the cloud. What you enter is kept on this phone and saved once MoneyKeel is updated.</Text>
      <TouchableOpacity hitSlop={Tap.slop} accessibilityRole="link" style={s.door} onPress={() => { Linking.openURL(APP_STORE_URL).catch(() => {}); }}>
        <Text style={s.doorT}>Update in the App Store ›</Text>
      </TouchableOpacity>
    </View>
  );
}

// THE ONE AMBER BOX (DataGapsBanner's box, account page v02): 12-point corners, the headline at 700 in amber
const s = StyleSheet.create({
  box: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, borderRadius: Radii.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  head: { fontSize: 13, fontWeight: '700', color: Colors.amber },
  line: { fontSize: 13, color: Colors.textPrimary, marginTop: 2, lineHeight: 18 },
  door: { minHeight: 44, justifyContent: 'center' },
  doorT: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
