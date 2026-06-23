// B-L3: ONE disclaimer, shown at the foot of every screen that turns numbers into a judgment
// (retirement readiness, on-track/gap, savings-rate nudges, emergency-fund verdicts, safety plans).
// Estimates are not financial advice and projections aren't guaranteed — stated at the point of advice,
// not just buried in Settings. The full statement lives in Settings; this is the consistent footer.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../utils/theme';

const DEFAULT =
  'Estimates for guidance only — not financial, investment, or tax advice, and projections aren\'t guaranteed. See Settings for the full disclaimer.';

export function Disclaimer({ text }: { text?: string }) {
  return (
    <Text style={styles.text} accessibilityRole="text">
      {text ?? DEFAULT}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    lineHeight: 16,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
});
