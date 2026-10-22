// THE MISSING-DATA BANNER + FIX-IT SHEET (founder-approved final mocks, 2026-08-04).
// Founder's rule: no standing disclaimers. This renders NOTHING when every promised number is
// complete. When something is missing it appears INLINE (never a pop-up), counts the gaps, and
// names each one; tapping opens a bottom sheet where every row carries what's missing, what we're
// honestly doing meanwhile, and a button that lands on the exact cure.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radii, Spacing } from '../utils/theme';
import { modalAnimation } from '../hooks/reducedMotion';
import { gapsHeadline, type DataGap } from '../domain/gaps';

/** THE ACCOUNT'S OWN PAGE (account-page drawing v01, state D — approved 2026-10-19). The same box, the same hanging
 *  bullets (DEC-6078) and the same sheet behind the headline. On the page itself the headline is amber, each bullet says
 *  the gap as the page says it and what the app does meanwhile, and the doors sit in the box: each gap's own cure once,
 *  then "Sync now" for a linked account. `onFix` performs a cure the page owns (true = handled), such as opening its own
 *  dividend recorder; any other cure goes where the gap's route says. */
export interface OnPage { sync: boolean; onFix?: (g: DataGap) => boolean }

/** Run the sync in place and say what it did — one handler for the sheet's rows and the page's door.
 *  FOUNDER FINDING 2026-08-11: this ignored the result and always said "Updated", even when NOTHING had been refreshed
 *  — which is what happened, so the message claimed success while both rows stayed exactly where they were. The count
 *  is what actually came back; say that, and nothing else. */
async function syncNow(): Promise<string> {
  try {
    const { runSnapTradeSync } = require('../services/sync/snaptradeSync');
    const n = await runSnapTradeSync({ force: true });
    return n > 0
      ? `Updated ${plural(n, 'account')}. Anything still listed below needs linking again — use Link again.`
      : "Nothing could be refreshed — your broker didn't answer. That usually means the link has expired: use Link again below.";
  } catch {
    return "We couldn't reach it just now — use Link again below to sign in again.";
  }
}

export function DataGapsBanner({ gaps, onPage }: { gaps: DataGap[]; onPage?: OnPage }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);      // which row is syncing right now
  const [result, setResult] = useState<string | null>(null);  // what the sync actually did — never silent
  const headline = gapsHeadline(gaps);
  if (!headline) return null;                      // zero gaps → zero banner → a clean screen

  // the page's doors: each gap's own cure once, in order, then "Sync now" for a linked account
  const doors: { label: string; gap: DataGap | null }[] = [];
  if (onPage) {
    for (const g of gaps) if (!doors.some((d) => d.label === g.fixLabel)) doors.push({ label: g.fixLabel, gap: g });
    if (onPage.sync && !doors.some((d) => d.label === 'Sync now')) doors.push({ label: 'Sync now', gap: null });
  }
  const pressDoor = async (d: { label: string; gap: DataGap | null }, i: number) => {
    if (!d.gap || d.gap.action === 'sync') {
      setBusy(-1 - i); setResult(null);
      setResult(await syncNow()); setBusy(null);
      return;
    }
    if (onPage?.onFix?.(d.gap)) return;
    router.push(d.gap.route as any);
  };

  return (
    <>
      {onPage ? (
        <View style={s.banner} testID="gaps-on-page">
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={() => setOpen(true)}
            accessibilityLabel={`${headline}. ${gaps.map((g) => g.onItsPage ?? g.title).join('. ')}. Opens how to fix them.`}>
            <Text style={[s.head, s.headOnPage]}>⚠ {headline} ›</Text>
          </TouchableOpacity>
          {/* THE BULLETS HANG (DEC-6078): the dot in its own column, the words on one left edge */}
          {gaps.slice(0, 3).map((g, i) => (
            <View key={i} style={[s.lineRow, s.lineRowOnPage]} testID="gap-line">
              <Text style={[s.line, s.lineOnPage]}>·</Text>
              <Text style={[s.line, s.lineOnPage, s.lineText]}>{g.onItsPage ?? g.title}. {g.meanwhile}</Text>
            </View>
          ))}
          {gaps.length > 3 && (
            <View style={[s.lineRow, s.lineRowOnPage]} testID="gap-line">
              <Text style={[s.line, s.lineOnPage]}>·</Text>
              <Text style={[s.line, s.lineOnPage, s.lineText]}>and {gaps.length - 3} more</Text>
            </View>
          )}
          <View style={s.pageDoors}>
            {doors.map((d, i) => (
              <TouchableOpacity key={d.label} accessibilityRole="button" disabled={busy != null}
                style={[s.pageDoor, i === 0 ? s.pageDoorFill : s.pageDoorLine]} hitSlop={{ top: 4, bottom: 4 }}
                onPress={() => pressDoor(d, i)}
                accessibilityLabel={!d.gap || d.gap.action === 'sync' ? `${d.label}. Updates this account now.` : d.label}>
                <Text style={[s.pageDoorTxt, i === 0 ? s.pageDoorTxtFill : s.pageDoorTxtLine]}>{busy === -1 - i ? 'Syncing…' : `${d.label} ›`}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!result && <Text style={s.result} accessibilityLiveRegion="polite">{result}</Text>}
        </View>
      ) : (
      <TouchableOpacity accessibilityRole="button" style={s.banner} activeOpacity={0.85} onPress={() => setOpen(true)}
        accessibilityLabel={`${headline}. ${gaps.map((g) => g.title).join('. ')}. Opens how to fix them.`}>
        <Text style={s.head}>⚠ {headline} ›</Text>
        {/* THE BULLETS HANG (DEC-6078, 2026-10-19, his words: "bullet in amber box text on the left should be
            aligned."): the dot sits in its own narrow column, so a line that wraps starts again at the text's left
            edge, not under the dot */}
        {gaps.slice(0, 3).map((g, i) => (
          <View key={i} style={s.lineRow} testID="gap-line">
            <Text style={s.line}>·</Text>
            <Text style={[s.line, s.lineText]}>{g.title}</Text>
          </View>
        ))}
        {gaps.length > 3 && (
          <View style={s.lineRow} testID="gap-line">
            <Text style={s.line}>·</Text>
            <Text style={[s.line, s.lineText]}>and {gaps.length - 3} more</Text>
          </View>
        )}
      </TouchableOpacity>
      )}

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
                    if (g.action !== 'sync') {
                      setOpen(false);
                      // on the account's own page, a cure the page performs itself stays on the page
                      if (onPage?.onFix?.(g)) return;
                      router.push(g.route as any); return;
                    }
                    setBusy(i); setResult(null);
                    setResult(await syncNow());
                    setBusy(null);
                  }}
                  accessibilityLabel={g.action === 'sync' ? `${g.fixLabel}. Updates this account now.` : g.fixLabel}>
                  <Text style={s.fixTxt}>{busy === i ? 'Syncing…' : `${g.fixLabel} ›`}</Text>
                </TouchableOpacity>
                {/* the second door — always present on a connection row, so "needs linking again" is
                    never advice without a way to act on it (founder finding 2026-08-11) */}
                {!!g.alt && (
                  <TouchableOpacity accessibilityRole="button" style={s.altBtn}
                    onPress={() => { setOpen(false); router.push(g.alt!.route as any); }}
                    accessibilityLabel={`${g.alt.label} — link this account again`}>
                    <Text style={s.altTxt}>{g.alt.label} ›</Text>
                  </TouchableOpacity>
                )}
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
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  lineText: { flex: 1 },
  // the account's own page (drawing v01, .warnb): the headline in amber, the words in the text colour, the doors in the box
  headOnPage: { color: Colors.amber },
  lineRowOnPage: { marginTop: 2 },
  lineOnPage: { color: Colors.textPrimary },
  pageDoors: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pageDoor: { minHeight: 36, borderRadius: Radii.md, paddingHorizontal: 14, justifyContent: 'center' },
  pageDoorFill: { backgroundColor: Colors.primaryDeep },
  pageDoorLine: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.primaryDeep },
  // 13, every door's size: the drawing's small door writes 12, which is not on the app's one type scale (SectionBand.test)
  pageDoorTxt: { fontSize: 13, fontWeight: '800' },
  pageDoorTxtFill: { color: Colors.white },
  pageDoorTxtLine: { color: Colors.primaryDeep },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: Colors.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.base, paddingBottom: 32 },
  grab: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.bgTertiary, alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  sheetSub: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  // the drawing's one card ring (Net worth v08, state F, .gapcard: box-shadow 0 0 0 1px at 5% black) — a 1px line in RN,
  // which draws no blurred shadow; the hero and the ledger are drawn flat, with none (2026-10-20)
  gapCard: { backgroundColor: Colors.white, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  gapTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  gapSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  fixBtnBusy: { opacity: 0.6 },
  altBtn: { borderWidth: 1, borderColor: Colors.primaryDeep, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 12 },
  altTxt: { color: Colors.primaryDeep, fontSize: 13, fontWeight: '800' },
  result: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, marginBottom: 8 },
  fixBtn: { backgroundColor: Colors.primaryDeep, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8, paddingHorizontal: 12 },
  fixTxt: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  foot: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', marginTop: 4 },
});
