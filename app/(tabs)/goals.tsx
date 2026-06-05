import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../../src/utils/theme';

export default function GoalsTab() {
  return (
    <View style={s.root}>
      <Text style={s.emoji}>🎯</Text>
      <Text style={s.title}>Goals</Text>
      <Text style={s.sub}>Coming soon — turn your non-monthly costs and dreams into save-by-date goals, funded from what you have left to save.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 21 },
});
