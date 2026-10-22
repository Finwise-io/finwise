// The source chip (mock #3 APPROVED 2026-07-31): one small pill per account row naming where its
// numbers come from and how fresh they are. Words + icon always (never color alone); a paused
// connection turns amber with the reconnect nudge.
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Colors, Radii } from '../utils/theme';
import { sourceWording, type AssetAccount } from '../domain/assets';

/** WHERE AN ACCOUNT'S NUMBERS COME FROM, in words — the one definition. The chip draws them as a pill;
 *  a line that carries them inside a sentence ("🔗 Linked · wealth generated $2,000") asks for the same
 *  words, so the two can never name one account's source differently.
 *  THE WORDS ARE MK-NW-F-045 sourceWording's (2026-10-20) — source always, its age only when stale (DEC-0301, DEC-0470,
 *  DEC-0478). The chip wrote its own: a linked account by the one rule, but an import with its date every time, so a
 *  file imported this morning read "Imported · Oct 20, 2026" while the same account's line on Net worth read
 *  "Imported". Only the paused link, which is not a source but a state of one, keeps words of its own. */
export function sourceWords(account: AssetAccount, paused?: boolean, now: number = Date.now()): { icon: string; text: string; bg: string; fg: string } {
  const text = sourceWording(account, now);
  if (account.source === 'connected') {
    if (paused) return { icon: '⏸', text: 'Link paused · link again ›', bg: Colors.amberLight, fg: Colors.amber };
    // founder 2026-09-14: "connected only unless stale" and "linked / link again" — the date shows only when stale
    return { icon: '🔗', text, bg: Colors.primaryLight, fg: Colors.primaryDark };
  }
  if (account.source === 'imported') return { icon: '📄', text, bg: Colors.blueLight, fg: Colors.blue };
  return { icon: '✍️', text, bg: Colors.bgTertiary, fg: Colors.textSecondary };
}

export function SourceChip({ account, paused }: { account: AssetAccount; paused?: boolean }) {
  const { icon, text, bg, fg } = sourceWords(account, paused);
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.txt, { color: fg }]}>{icon} {text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { alignSelf: 'flex-start', borderRadius: Radii.pill ?? 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3, overflow: 'hidden' },
  txt: { fontSize: 11, fontWeight: '700' },
});
