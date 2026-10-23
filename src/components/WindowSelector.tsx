/** THE WINDOW SELECTOR — one control, a return under each window (Performance v17; mock v14). Moved here from
 *  PerformanceScreen on 2026-10-19 so the account page prints the very same control (DEC-6079, his words: "Also check
 *  in perf 17 did we have bar to select time period at the top on account page or not? We should have one."). */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Radii, Shadows } from '../utils/theme';
import { fig, figSaid } from './figure';   // rule 11: a figure prints with its identifier, and is said through the one spoken writer

export function WindowSelector({ windows, chosen, figures, onPick }: {
  windows: { key: string; label: string }[];
  chosen: string;
  figures: Record<string, { ret: number | null; perYear?: number | null; covered?: boolean; workedBack?: boolean }>;
  onPick: (key: string) => void;
}) {
  return (
    <View style={styles.segBar} testID="window-bar">
      {windows.map((w, i) => {
        const on = w.key === chosen;
        // MARK 18 (mock v17, approved 2026-09-30): a window longer than a year reads "+7.30%/year" here.
        // This is where the yearly rate lives; the summary trio prints the plain percent so its three
        // cells fit one row. A window whose return cannot be measured shows an em-dash — nothing stands
        // in for a time-weighted return (owner, 2026-10-04; mark 16's stand-in rate is gone).
        // A WINDOW NEITHER COVERED NOR WORKED BACK IS GREYED TO AN EM-DASH AND CANNOT BE PICKED (v17: "the
        // screen states nothing rather than a guess"): nobody recorded its beginning and no price history reaches it.
        // A window WORKED BACK is not greyed: it shows the holdings' figures and the sentence under them, as each
        // account's card does (DEC-5068) — with no record at all, or a record that begins after the window opens
        // (DEC-5291, 2026-10-13: "Let price history count"). Only where no holding has a history does a window the
        // record cannot reach stay greyed (DEC-3035i's case, kept).
        // THE SINCE WINDOW IS NEVER GREYED (2026-10-19). It is the window the page and the tab open on, and on a record
        // that begins today v17's approved day one draws it picked with a dash. Greyed only when NOT picked, it read
        // two ways for one record — picked with a dash on the account-page drawing's state C, greyed on state D — and
        // a person who opened the page on it and tapped 1Y could not get back to it. So it can always be picked; with
        // no figure it shows a dash at rest (name in the resting grey), never in the greys of a window that cannot be
        // picked. Every other window keeps the rule above.
        const always = w.key === 'SINCE';
        const uncovered = !always && figures[w.key]?.covered === false && !figures[w.key]?.workedBack && !on;
        const ret = uncovered ? null : figures[w.key]?.ret ?? null;
        const greyed = ret == null && !on && !always;
        const perYear = !uncovered && figures[w.key]?.perYear != null;
        const divider = i > 0 && !on && chosen !== windows[i - 1].key;
        return (
          <React.Fragment key={w.key}>
            {divider && <View style={styles.segDivider} />}
            <TouchableOpacity
              style={[styles.seg, w.key === 'SINCE' && styles.segWide, on && styles.segOn]}
              disabled={uncovered}
              accessibilityRole="button" accessibilityState={{ selected: on, disabled: uncovered }}
              accessibilityLabel={`Show ${w.label}${ret == null ? ', no data for that window yet' : `, ${figSaid('MK-PF-M-017', ret, perYear ? 'year' : undefined)}`}`}
              onPress={() => onPick(w.key)}>
              {/* THE COLOURS v17 DRAWS (drawing check, 2026-10-12): a window at rest names itself in the tertiary grey;
                  one with no figure is greyed lighter still, name and dash (.segNo); the CHOSEN window is green even
                  when its figure is a dash (.segOn .segV — day one). The dash of the chosen window used to turn grey. */}
              <Text numberOfLines={1} style={[styles.segK, on && styles.segOnT, greyed && styles.segNoK]}>{w.label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.segV, on && styles.segOnT, greyed && styles.segNoV]}>
                {ret == null ? '—' : fig('MK-PF-M-017', ret)}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segBar: { flexDirection: 'row', backgroundColor: Colors.bgTertiary, borderRadius: Radii.md, padding: 3, marginBottom: 10 },
  seg: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 3 },
  segWide: { flex: 1.55 },                       // the Since window carries a date, so it gets the room
  segOn: { backgroundColor: Colors.white, ...Shadows.card },
  segDivider: { width: 1, marginVertical: 12, backgroundColor: Colors.border },
  segK: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary },
  segV: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  segOnT: { color: Colors.primaryDark },
  segNoK: { color: Colors.textDisabled },
  segNoV: { color: Colors.textDisabledFaint },
});
