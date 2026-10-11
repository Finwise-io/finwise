// AN ACCOUNT WITH NO TAX TYPE IS COUNTED TAXABLE FOR THE PLAN, AND NAMED (DEC-4105, 2026-10-10).
// His words: "An account with no tax type would be counted as taxable for the plan, with a line naming it:
// "Brokerage — tax type not stated; counted as taxable until you choose." … approved".
// One line per account the split (MK-PL-F-001 taxBucketSplit) counted taxable for want of a tax type; a tap opens that
// account's own editor, whose "Held in" choice sets it — the same door as the account page's
// "tax type not stated — choose ›" (DEC-4036f). Nothing at all when every account has a tax type.
// onOpen lets a sheet close itself before the editor opens.
// Each Plan / retirement screen that shows a figure built from the split prints this once.
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../utils/theme';
import { taxBucketSplit, countedTaxableLine } from '../domain/decumulation';
import type { AssetAccount } from '../domain/assets';

export function CountedTaxableLines({ accounts, style, onOpen }: { accounts: AssetAccount[]; style?: any; onOpen?: () => void }) {
  const router = useRouter();
  const named = taxBucketSplit(accounts ?? []).countedTaxableNotStated;   // the split's own list — one rule
  if (named.length === 0) return null;
  return (
    <View style={[s.wrap, style]}>
      {named.map((a) => (
        <TouchableOpacity key={a.asset_id} accessibilityRole="button" style={s.tap}
          accessibilityLabel={`${countedTaxableLine(a.name)} Tap to choose its tax type.`}
          onPress={() => { onOpen?.(); router.push(`/add-account?edit=${a.asset_id}` as any); }}>
          <Text style={s.line}>{countedTaxableLine(a.name)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 6 },
  tap: { minHeight: 44, justifyContent: 'center' },
  line: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary, paddingVertical: 4 },
});
