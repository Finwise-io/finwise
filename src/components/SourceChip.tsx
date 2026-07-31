// The source chip (mock #3 APPROVED 2026-07-31): one small pill per account row naming where its
// numbers come from and how fresh they are. Words + icon always (never color alone); a paused
// connection turns amber with the reconnect nudge.
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Radii } from '../utils/theme';
import { connectionFreshness } from '../services/sync';
import type { AssetAccount } from '../domain/assets';

export function SourceChip({ account, paused }: { account: AssetAccount; paused?: boolean }) {
  let icon = '✍️'; let text = 'By hand · you update it'; let bg = Colors.bgTertiary; let fg = Colors.textSecondary;
  if (account.source === 'connected') {
    if (paused) { icon = '⏸'; text = 'Connection paused · reconnect ›'; bg = Colors.amberLight; fg = Colors.amber; }
    else {
      const f = connectionFreshness(account.last_synced);
      icon = '🔗'; text = `Connected · ${f ? `updated ${f.label}` : 'linked'}`; bg = Colors.primaryLight; fg = Colors.primaryDark;
    }
  } else if (account.source === 'imported') {
    const day = account.last_synced ? String(account.last_synced).slice(0, 10) : '';
    icon = '📄'; text = `Imported${day ? ` · ${day}` : ''}`; bg = Colors.blueLight; fg = Colors.blue;
  }
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.txt, { color: fg }]}>{icon} {text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: Radii.pill ?? 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3, overflow: 'hidden' },
  txt: { fontSize: 10.5, fontWeight: '700' },
});
