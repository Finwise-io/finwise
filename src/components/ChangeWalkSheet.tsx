// THE CHANGE WALK SHEET (founder-approved final mock, mockup-vf/networth-FINAL State E, 2026-08-04).
// Tapping the net-worth change opens this. Structure is the founder's, identical to the Performance
// walk card: Beginning value → Contributions → Withdrawals → Wealth generated (Dividends · Interest ·
// Change in investment value) → Debt principal you paid → Ending value. Rows ALWAYS sum exactly.
// Wording differs by design: "net worth", not "market value" — home and debts have no market feed.
import { SHEET_FRAME, SHEET_HANDLE } from './sheetFrame';   // one sheet frame (NW3-18, 2026-10-31)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Colors, Radii, Spacing } from '../utils/theme';
import { modalAnimation } from '../hooks/reducedMotion';
import { SectionBand } from './SectionBand';
import { maskedMoney } from './useMoney';
import type { ChangeWalk } from '../domain/history';

/** Money with a true minus sign in front — a different job from the shared `money`, which is why
 *  it now has a different name. */
const signedMoney = (n: number) => `${n < 0 ? '−' : ''}${maskedMoney(Math.abs(Math.round(n)))}`;

export function ChangeWalkSheet({ visible, onClose, walk }: {
  visible: boolean; onClose: () => void; walk: ChangeWalk | null;
}) {
  if (!walk) return null;
  const rows: { label: string; value: number; indent?: boolean; strong?: boolean; muted?: boolean }[] = [
    { label: `Beginning net worth (${walk.fromLabel})`, value: walk.beginning },
    { label: 'Contributions', value: walk.contributions },
    { label: 'Withdrawals', value: -Math.abs(walk.withdrawals) },
    { label: 'Wealth generated', value: walk.wealthGenerated, strong: true },
    { label: 'Dividends', value: walk.dividends, indent: true, muted: true },
    { label: 'Interest', value: walk.interest, indent: true, muted: true },
    { label: 'Change in investment value', value: walk.marketChange, indent: true, muted: true },
    { label: 'Debt principal you paid', value: walk.debtPrincipal },
  ];
  return (
    <Modal visible={visible} transparent animationType={modalAnimation()} onRequestClose={onClose}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={s.scrim} activeOpacity={1} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.grab} />
        {/* THE BAR STARTS 10 POINTS UNDER THE HANDLE (v08 frame E, .grab + .walkband; drawing match round 2, NW2-04). The bar's own
            `inCard` pulls it up by the sheet's padding to meet a card's top edge; under the handle that put it 6 points over the
            handle, its square corners out past the sheet's round ones. This holder gives the padding back above it. */}
        <View style={s.bandHolder}>
          <SectionBand inCard inset={Spacing.base}
            title={`How ${maskedMoney(Math.round(walk.beginning))} became ${maskedMoney(Math.round(walk.ending))}`} />
        </View>
        <ScrollView style={{ maxHeight: 400 }}>
          {rows.map((r) => (
            <View key={r.label} style={[s.row, r.indent && s.indent]}>
              <Text style={[s.label, r.strong && s.strong, r.muted && s.muted]}>{r.label}</Text>
              {/* Net worth v08 state E (and Performance v17's walk): an indented value is grey like its
                  label (.wrow.ind .v), and a minus sign is the only mark a negative gets — never red. */}
              <Text style={[s.value, r.strong && s.strong, r.muted && s.muted]}>{signedMoney(r.value)}</Text>
            </View>
          ))}
          <View style={[s.row, s.total]}>
            <Text style={[s.label, s.strong]}>Ending net worth ({walk.toLabel})</Text>
            <Text style={[s.value, s.strong, { color: Colors.primaryDark }]}>{signedMoney(walk.ending)}</Text>
          </View>
          <Text style={s.note}>
            {walk.fromLabel} → {walk.toLabel}, {new Date().getFullYear()} · every line counts only what happened in this window.
            Contributions are not a gain — that’s why Wealth generated is its own section.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  // v08 frame E's .sheet: 10 above the handle, 16 at the sides (NW2-04)
  // v08 frame E's .sheet: 10 above the handle, 16 at the sides, 30 at the foot (NW2-04; the foot was 32, NW3-14)
  sheet: { ...SHEET_FRAME, backgroundColor: Colors.white /* v08 frame E draws the change walk white (approved, DEC-0644) */, padding: Spacing.base, paddingTop: 10, paddingBottom: 30 },
  // the 16 the bar's inCard takes back, so it lands on the handle's 10-point gap; and 2 under it, so the rows start 6 below the bar as
  // v08's .walkband draws (SectionBand leaves 4; 2026-10-31, NW3-14)
  bandHolder: { paddingTop: Spacing.base, paddingBottom: 2 },
  grab: { ...SHEET_HANDLE },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  indent: { paddingLeft: 20 },
  label: { flex: 1, fontSize: 13, color: Colors.textPrimary, paddingRight: Spacing.base },
  muted: { color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], minWidth: 92, textAlign: 'right' },
  strong: { fontWeight: '800' },
  total: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary, marginTop: 4, paddingTop: 10 },
  note: { fontSize: 11, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  radii: { borderRadius: Radii.lg },
});

