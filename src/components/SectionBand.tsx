// BANDED SECTIONS (founder-adopted 2026-08-04; UX design v1.2, Color + Layout rows): section
// titles sit on a DEEP-GREEN band in white caps; group sub-titles on the LIGHT-GREEN band in
// deep-green text. Totals ride the band, right-aligned. White caps on the mid brand green fails
// the 4.5:1 small-text floor — the deep green is the accessible band color, never primary.
// `inCard` bleeds the band to the card's edges (cards app-wide use Spacing.md padding + Radii.lg).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { InfoDot } from './UI';

export function SectionBand({ title, value, light, inCard, inset = Spacing.md, infoTerm }: {
  title: string; value?: string; light?: boolean; inCard?: boolean; inset?: number; infoTerm?: string;
}) {
  return (
    <View style={[s.band, light && s.light, inCard && { marginTop: -inset, marginHorizontal: -inset }]}>
      {/* the dot hugs the title text (founder 2026-08-10) — never floated to the band's far edge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
        <Text style={[s.title, { flex: 0, flexShrink: 1 }, light && s.textLight]} numberOfLines={1}
          adjustsFontSizeToFit minimumFontScale={0.75}>{title}</Text>
        {!!infoTerm && <InfoDot term={infoTerm as any} color={light ? Colors.primaryDeep : Colors.white} />}
      </View>
      {/* founder gap 4 (2026-08-10): the band bleeds to the card edge while rows are inset, so the
          value carries the same inset back — every number on the screen shares ONE right edge. */}
      {value != null && <Text style={[s.value, light && s.textLight, inCard && { marginRight: inset }]}>{value}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    alignSelf: 'stretch', backgroundColor: Colors.primaryDeep, paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderTopLeftRadius: Radii.lg, borderTopRightRadius: Radii.lg,
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs,
  },
  light: { backgroundColor: Colors.bandLight },
  title: { flex: 1, color: Colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  textLight: { color: Colors.primaryDeep },
  value: { color: Colors.white, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
