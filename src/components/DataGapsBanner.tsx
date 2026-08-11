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
  const [busy, setBusy] = useState<number | null>(null);      // which row is syncing right now
  const [result, setResult] = useState<string | null>(null);  // what the sync actually did — never silent
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
          {!!result && <Text style={s.result} accessibilityLiveRegion="polite">{result}</Text>}
          <ScrollView style={{ maxHeight: 380 }}>
            {gaps.map((g, i) => (
              <View key={i} style={s.gapCard}>
                <Text style={s.gapTitle}>{g.title}</Text>
                <Text style={s.gapSub}>{g.meanwhile}</Text>
                {/* Founder finding 2026-08-11: "Sync now" NAVIGATED to a page that cannot sync. A
                    button does what its label says — 'sync' runs the sync right here and reports
                    what happened; everything else still lands on the exact cure. */}
                <TouchableOpacity accessibilityRole="button" style={[s.fixBtn, busy === i && s.fixBtnBusy]}
                  disabled={busy != null}
                  onPress={async () => {
                    if (g.action !== 'sync') { setOpen(false); router.push(g.route as any); return; }
                    setBusy(i); setResult(null);
                    try {
                      const { runSnapTradeSync } = require('../services/sync/snaptradeSync');
                      await runSnapTradeSync({ force: true });
                      setResult('Updated. Anything still listed here needs a re-login.');
                    } catch {
                      setResult("We couldn't reach it just now — the connection may need a re-login.");
                    } finally { setBusy(null); }
                  }}
                  accessibilityLabel={g.action === 'sync' ? `${g.fixLabel}. Updates this account now.` : g.fixLabel}>
                  <Text style={s.fixTxt}>{busy === i ? 'Syncing…' : `${g.fixLabel} ›`}</Text>
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
  fixBtnBusy: { opacity: 0.6 },
  result: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8 },
  fixBtn: { backgroundColor: Colors.primaryDeep, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 12 },
  fixTxt: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  foot: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
