// BANDED SECTIONS (founder-adopted 2026-08-04; UX design v1.2, Color + Layout rows): section
// titles sit on a DEEP-GREEN band in white caps; group sub-titles on the LIGHT-GREEN band in
// deep-green text. Totals ride the band, right-aligned. White caps on the mid brand green fails
// the 4.5:1 small-text floor — the deep green is the accessible band color, never primary.
// `inCard` bleeds the band to the card's edges (cards app-wide use Spacing.md padding).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '../utils/theme';
import { InfoDot } from './UI';

export function SectionBand({ title, value, light, inCard, inset = Spacing.md, infoTerm, trailing = 0, quiet }: {
  title: string; value?: string; light?: boolean; inCard?: boolean; inset?: number; infoTerm?: string;
  /** width of the row's trailing arrow column, so a band total lands on the SAME right edge as a row
   *  value that is followed by a `›` (Net worth's flat ledger). 0 = no arrow column on the rows. */
  trailing?: number;
  /** THE SECOND HEADING LEVEL (Claude Design v3 hierarchy, founder-approved 2026-08-13).
   *  One heading style meant every heading became a full-width green bar — seven of them down the
   *  Plan tab, so nothing was emphasised because everything was. A quiet caps label names a SECTION;
   *  the filled band is reserved for a group that carries its own total riding the right edge.
   *  NOTE the colour: v3 specifies the mid brand green for this label, which measures 3.78:1 on the
   *  app background and fails the 4.5:1 floor for small text. The deep green measures 8.74:1 and is
   *  the accessible choice — the same lesson the band itself already carries. */
  quiet?: boolean;
}) {
  const valuePad = (inCard ? inset : 0) + trailing;

  if (quiet) {
    return (
      <View style={[s.quietWrap, inCard && { marginHorizontal: -inset }]}>
        <Text style={s.quietTitle} numberOfLines={1}>{title}</Text>
        {!!infoTerm && <InfoDot term={infoTerm as any} color={Colors.primaryDeep} />}
        <View style={{ flex: 1 }} />
        {value != null && <Text style={s.quietValue}>{value}</Text>}
      </View>
    );
  }
  return (
    <View style={[s.band, light && s.light, inCard && { marginTop: -inset, marginHorizontal: -inset }]}>
      {/* the dot hugs the title text (founder 2026-08-10): plain siblings + a spacer — no nested
          row, because the nested flex collapsed the title to nothing on web. */}
      <Text style={[s.title, { flex: 0, flexShrink: 1 }, light && s.textLight]} numberOfLines={1}>{title}</Text>
      {!!infoTerm && <InfoDot term={infoTerm as any} color={light ? Colors.primaryDeep : Colors.white} />}
      <View style={{ flex: 1 }} />
      {/* founder gap 4 (2026-08-10): the band bleeds to the card edge while rows are inset, so the
          value carries the same inset back — every number on the screen shares ONE right edge. */}
      {value != null && <Text style={[s.value, light && s.textLight, valuePad > 0 && { marginRight: valuePad }]}>{value}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  band: {
    // Founder 2026-08-11: SQUARE corners. A band runs edge to edge, and rounded tops read as a card
    // lid rather than a section rule — this is the one change that makes the whole app agree.
    alignSelf: 'stretch', backgroundColor: Colors.primaryDeep, paddingVertical: 8, paddingHorizontal: Spacing.md,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs,
  },
  light: { backgroundColor: Colors.bandLight },
  // the quiet level: no fill, deep-green caps, sitting on the page rather than on a bar
  quietWrap: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xs,
  },
  quietTitle: {
    flex: 0, flexShrink: 1, color: Colors.primaryDeep, fontSize: 11, fontWeight: '800',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  quietValue: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  title: { flex: 1, color: Colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  textLight: { color: Colors.primaryDeep },
  // Founder 2026-08-11: every money figure on a screen is ONE size (15) and a total is bold, so a
  // band total and the row values beneath it read as one column rather than two.
  value: { color: Colors.white, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
