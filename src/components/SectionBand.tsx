// BANDED SECTIONS (founder-adopted 2026-08-04; UX design v1.2, Color + Layout rows): section
// titles sit on a DEEP-GREEN band in white caps; group sub-titles on the LIGHT-GREEN band in
// deep-green text. Totals ride the band, right-aligned. White caps on the mid brand green fails
// the 4.5:1 small-text floor — the deep green is the accessible band color, never primary.
// `inCard` bleeds the band to the card's edges (cards app-wide use Spacing.md padding).
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing } from '../utils/theme';
import { InfoDot } from './UI';

export function SectionBand({ title, value, light, inCard, inset = Spacing.md, infoTerm, trailing = 0, quiet, onTitlePress, titleHint }: {
  title: string; value?: string; light?: boolean; inCard?: boolean; inset?: number; infoTerm?: string;
  /** THE NAME IS ITS OWN DOOR (founder, 2026-09-27: "build it" — approved mock v14, first phone,
   *  "Tap ▾ to collapse · tap the name to open this account's portfolio ›"). One bar, two jobs: the
   *  title opens the thing it names, everywhere else on the bar does whatever the bar already did.
   *  Given without `onTitlePress`, nothing changes — every existing band is untouched. */
  onTitlePress?: () => void;
  /** What a screen reader says for that door, e.g. "Open E*TRADE Account 1". */
  titleHint?: string;
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
    // ALIGNMENT (audit D10). For a FILLED band, `inCard` means "bleed out to the card's edges". A
    // quiet label has no fill, so bleeding is meaningless — but the flag still carries the one fact
    // that matters here: whether a card's own padding already sits to my left.
    //   inside a card  → the card contributes its padding, so add one more to reach its content edge
    //   outside a card → nothing to my left, so add both
    // Either way the text lands on the SAME line as every row and every other heading. Obeying the
    // flag literally (bleeding) put one heading 12pt left of six others; ignoring it entirely left
    // the headings that sit outside cards 12pt left of the ones inside them.
    return (
      <View style={[s.quietWrap, { paddingHorizontal: inCard ? inset : inset * 2 }]}>
        <Text style={s.quietTitle} numberOfLines={1}>{title}</Text>
        {!!infoTerm && <InfoDot size={11} term={infoTerm as any} color={Colors.primaryDeep} />}
        <View style={{ flex: 1 }} />
        {value != null && <Text style={s.quietValue}>{value}</Text>}
      </View>
    );
  }
  return (
    <View style={[s.band, light && s.light, inCard && { marginTop: -inset, marginHorizontal: -inset }]}>
      {/* the dot hugs the title text (founder 2026-08-10): plain siblings + a spacer — no nested
          row, because the nested flex collapsed the title to nothing on web. */}
      {onTitlePress ? (
        // hitSlop, not a taller bar: the bar is 11-point caps on 8 points of padding, and stretching
        // it to 44 would change every band on every screen. The finger target is 44; the bar is not.
        <TouchableOpacity onPress={onTitlePress} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          style={{ flex: 0, flexShrink: 1 }} accessibilityRole="button" accessibilityLabel={titleHint ?? title}>
          <Text style={[s.title, { flex: 0, flexShrink: 1, textDecorationLine: 'underline' }, light && s.textLight]} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={[s.title, { flex: 0, flexShrink: 1 }, light && s.textLight]} numberOfLines={1}>{title}</Text>
      )}
      {/* the band title is 11pt — the dot matches it rather than looming over it */}
      {!!infoTerm && <InfoDot size={11} term={infoTerm as any} color={light ? Colors.primaryDeep : Colors.white} />}
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
