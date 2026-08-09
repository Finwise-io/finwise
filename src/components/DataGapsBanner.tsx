// THE MISSING-DATA BANNER + FIX-IT SHEET (founder-approved final mocks, 2026-08-04).
// Founder's rule: no standing disclaimers. This renders NOTHING when every promised number is
// complete. When something is missing it appears INLINE (never a pop-up), counts the gaps, and
// names each one; tapping opens a bottom sheet where every row carries what's missing, what we're
// honestly doing meanwhile, and a button that lands on the exact cure.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radii, Spacing } from '../utils/theme';
import { modalAnimation } from '../hooks/reducedMotion';
import { gapsHeadline, type DataGap } from '../domain/gaps';

export function DataGapsBanner({ gaps }: { gaps: DataGap[] }) {
  const [open, setOpen] = useState(false);
  const headline = gapsHeadline(gaps);
  if (!headline) return null;                      // zero gaps → zero banner → a clean screen

  return (
    <>
      <TouchableOpacity accessibilityRole="button" style={s.banner} activeOpacity={0.85} onPress={() => setOpen(true)}
        accessibilityLabel={`${headline}. ${gaps.map((g) => g.title).join('. ')}. Opens how to fix them.`}>
        <Text style={s.head}>⚠ {headline} ›</Text>
        {gaps.slice(0, 3).map((g, i) => (
          <Text key={i} style={s.line}>· {g.title}</Text>
        ))}
        {gaps.length > 3 && <Text style={s.line}>· and {gaps.length - 3} more</Text>}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType={modalAnimation()} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" style={s.scrim} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={s.sheet}>
          <View style={s.grab} />
          <Text style={s.sheetTitle}>{headline}</Text>
          <Text style={s.sheetSub}>Fix them here — the banner clears itself when they close.</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            {gaps.map((g, i) => (
              <View key={i} style={s.gapCard}>
                <Text style={s.gapTitle}>{g.title}</Text>
                <Text style={s.gapSub}>{g.meanwhile}</Text>
                <TouchableOpacity accessibilityRole="button" style={s.fixBtn}
                  onPress={() => { setOpen(false); router.push(g.route as any); }}
                  accessibilityLabel={g.fixLabel}>
                  <Text style={s.fixTxt}>{g.fixLabel} ›</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Text style={s.foot}>Nothing here is a nag — each row exists only while its gap does.</Text>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  banner: { backgroundColor: Colors.amberLight, borderWidth: 1, borderColor: Colors.amber, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  head: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  line: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.base, paddingBottom: 32 },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.bgTertiary, alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  sheetSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  gapCard: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  gapTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  gapSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  fixBtn: { backgroundColor: Colors.primaryDeep, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 12 },
  fixTxt: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  foot: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
