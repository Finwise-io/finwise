// Worth a look — transaction detail (F10, FCC detailed design v1.1). The calm close-up of a flagged
// transaction: the plain facts, why it stood out (one honest comparison), and a two-button resolution.
// Reassures more than it warns — the words scam/fraud/alert never appear in v1, nothing is ever red.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { flagComparisonText, type TxnFlag } from '../domain/transactions/flags';
import { maskedMoney, maskDollars } from '../components/useMoney';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const prettyDate = (d: string) => {
  const dt = new Date(`${d}T12:00:00`);
  return isNaN(dt.getTime()) ? d : `${WEEKDAYS[dt.getDay()]}, ${dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

export default function WorthALookScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const flags = (store.txnFlags ?? []) as TxnFlag[];
  // open cards first (newest first), then user-flagged follow-ups, then resolved history
  const ordered = useMemo(() => [
    ...flags.filter((f) => f.status === 'open'),
    ...flags.filter((f) => f.status === 'flagged'),
    ...flags.filter((f) => f.status === 'was_me'),
  ], [flags]);
  const [idx, setIdx] = useState(0);
  const [checklist, setChecklist] = useState(false);
  const [noted, setNoted] = useState(false);
  const f = ordered[Math.min(idx, ordered.length - 1)];

  const accounts = store.assetAccounts ?? [];
  const accountName = (id: string) => {
    const a = accounts.find((x: any) => String(x.asset_id) === String(id));
    return a ? (a.institution?.trim() ? `${a.institution.trim()} ${a.label}` : a.label) : 'an account';
  };

  if (!f) {
    return (
      <View style={[styles.root, { justifyContent: 'center', padding: Spacing.lg }]}>
        <Text style={styles.magnifier}>🔍</Text>
        <Text style={[styles.factHead, { textAlign: 'center' }]}>Nothing to look at</Text>
        <Text style={[styles.softener, { textAlign: 'center' }]}>
          When an account is connected, we watch it for odd transactions — hand-typed entries are yours, we never question them.
        </Text>
      </View>
    );
  }

  const wasMe = () => { store.resolveTxnFlag?.(f.flag_id, 'was_me'); setNoted(true); setTimeout(() => router.back(), 650); };
  const somethingOff = () => { store.resolveTxnFlag?.(f.flag_id, 'flagged'); setChecklist(true); };
  const markSettled = () => { store.resolveTxnFlag?.(f.flag_id, 'settled'); router.back(); };

  const resolvedWasMe = f.status === 'was_me';
  const flaggedByYou = f.status === 'flagged' || checklist;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.magnifier} accessibilityElementsHidden importantForAccessibility="no">🔍</Text>

      {/* fact block — pure facts from the transaction record, one sentence for screen readers */}
      <Text style={styles.factHead}
        accessibilityLabel={`${maskedMoney(f.amount)} left ${accountName(f.account_id)} on ${prettyDate(f.date)}${f.payee ? `, paid to ${f.payee}` : ''}`}>
        {maskedMoney(f.amount)} left {accountName(f.account_id)} on {prettyDate(f.date)}
      </Text>
      {f.payee ? <Text style={styles.payee}>Paid to: {f.payee.toUpperCase()}</Text> : null}

      {/* why we're showing this — the comparison stored at flag time, so it never drifts */}
      <Text style={styles.whyHead}>WHY WE'RE SHOWING THIS</Text>
      {/* the comparison masks its dollars but stays readable — '8 times your usual' is words */}
      <Text style={styles.whyBody}>{maskDollars(flagComparisonText(f))}</Text>
      <Text style={styles.softener}>Most large {f.reason === 'first_time_payee' ? 'first-time ' : ''}payments are fine — you know best.</Text>

      {resolvedWasMe ? (
        <Text style={styles.confirmed}>You confirmed this on {String(f.resolved_at ?? '').slice(0, 10)} ✓ confirmed</Text>
      ) : flaggedByYou ? (
        <View style={styles.checklistBox}>
          <Text style={styles.checklistHead}>WHAT TO DO — just the map, no commands</Text>
          <Text style={styles.checklistItem}>1. Call the number on the back of your bank card — they can freeze the card and reverse charges.</Text>
          <Text style={styles.checklistItem}>2. If you shared a code or password recently, change it.</Text>
          <Text style={styles.checklistItem}>3. This stays here for your records until you mark it settled.</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={markSettled} accessibilityLabel="Mark settled">
            <Text style={styles.primaryTxt}>Mark settled</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} onPress={wasMe} accessibilityLabel="Yes, this was me">
            <Text style={styles.primaryTxt}>{noted ? 'Noted.' : 'Yes, this was me'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.secondaryBtn} onPress={somethingOff} accessibilityLabel="Something's off — show me what to do">
            <Text style={styles.secondaryTxt}>Something's off — show me what to do</Text>
          </TouchableOpacity>
        </>
      )}

      {/* previous / next when several cards exist */}
      {ordered.length > 1 && (
        <View style={styles.navRow}>
          <TouchableOpacity accessibilityRole="button" disabled={idx === 0} onPress={() => { setIdx(idx - 1); setChecklist(false); setNoted(false); }}
            accessibilityLabel="Previous flagged transaction">
            <Text style={[styles.navTxt, idx === 0 && styles.navOff]}>‹ Previous</Text>
          </TouchableOpacity>
          <Text style={styles.navCount}>{Math.min(idx, ordered.length - 1) + 1} of {ordered.length}</Text>
          <TouchableOpacity accessibilityRole="button" disabled={idx >= ordered.length - 1} onPress={() => { setIdx(idx + 1); setChecklist(false); setNoted(false); }}
            accessibilityLabel="Next flagged transaction">
            <Text style={[styles.navTxt, idx >= ordered.length - 1 && styles.navOff]}>Next ›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* the read-only promise, at the exact moment of worry — same wording as the connect screen */}
      <Text style={styles.footer}>We can only look at your accounts — we can never move or block money. Your bank can.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  magnifier: { fontSize: 40, textAlign: 'center', marginVertical: Spacing.md },
  factHead: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', lineHeight: 28 },
  payee: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
  whyHead: { fontSize: 12, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: Spacing.lg, marginBottom: 6 },
  whyBody: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  softener: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginTop: 8 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg },
  primaryTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  secondaryBtn: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, paddingHorizontal: 12 },
  secondaryTxt: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  confirmed: { fontSize: 15, fontWeight: '700', color: Colors.primary, textAlign: 'center', marginTop: Spacing.lg },
  checklistBox: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.lg },
  checklistHead: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 8 },
  checklistItem: { fontSize: 14.5, color: Colors.textPrimary, lineHeight: 21, marginBottom: 8 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg },
  navTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary, paddingVertical: 8 },
  navOff: { color: Colors.textTertiary },
  navCount: { fontSize: 13, color: Colors.textSecondary },
  footer: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: Spacing.xl },
});
