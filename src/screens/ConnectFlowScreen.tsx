// Connect flow (FCC detailed design v1.1, Net worth r18-r33): let a cautious 55-70 user link
// an account with ZERO surprises — pick the institution, read exactly what happens to their
// data (the approved honest wording: it flows through the connection service's servers; we
// never say 'never leaves your device'), then hand off to the provider's own sign-in. Manual
// entry and file import are offered right there, as equals. After accounts come back: pick
// which to track, and anything that matches an account you already have becomes a MERGE
// question — connect-over-existing updates the existing row (history and settings kept),
// never a twin (r27, the anti-duplicate gate).
// The vendor handoff runs behind the F1 seam (src/services/sync). No provider in this build →
// the screen says so honestly and the equal doors still work. Never a dead button.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney } from '../components/useMoney';
import { activeSyncProvider, CONSENT_COPY, type FoundAccount } from '../services/sync';
import { snaptradeConfigured } from '../services/sync/snaptradeClient';
import SnapTradeConnect from './SnapTradeConnect';
import { useLocalSearchParams } from 'expo-router';
import type { AssetAccount } from '../domain/assets';

export default function ConnectFlowScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const params = useLocalSearchParams<{ reconnect?: string }>();
  const provider = useMemo(() => activeSyncProvider(), []);
  // LIVE path (design v2): the relay is configured → the real SnapTrade flow with honesty cards.
  // The sandbox path below stays for dev/tests — same doors, same consent, same merge gate.
  if (snaptradeConfigured()) {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Connect an account</Text>
        <Text style={s.sub}>Read-only: we can look, never touch your money.</Text>
        <SnapTradeConnect reconnectId={params.reconnect ? String(params.reconnect) : undefined} />
      </ScrollView>
    );
  }
  const accounts: AssetAccount[] = store.assetAccounts ?? [];

  const [step, setStep] = useState<'institution' | 'consent' | 'found'>('institution');
  const [query, setQuery] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [institution, setInstitution] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<FoundAccount[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [mergeChoice, setMergeChoice] = useState<Record<string, 'update' | 'new'>>({});

  useEffect(() => {
    let live = true;
    provider?.searchInstitutions(query).then((r) => { if (live) setNames(r); });
    return () => { live = false; };
  }, [provider, query]);

  // the anti-duplicate matcher: same institution + same kind of account = probably the same account
  const matchExisting = (f: FoundAccount): AssetAccount | undefined =>
    accounts.find((a) => (a.institution ?? '').trim().toLowerCase() === f.institution.trim().toLowerCase() && a.kind === f.kind);

  const startLink = async () => {
    if (!provider) return;
    setBusy(true);
    try {
      const r = await provider.linkAccounts(institution);
      setFound(r);
      setPicked(Object.fromEntries(r.map((f) => [f.external_id, true])));
      setMergeChoice(Object.fromEntries(r.filter(matchExisting).map((f) => [f.external_id, 'update'])));
      setStep('found');
    } finally { setBusy(false); }
  };

  const save = () => {
    const now = new Date().toISOString();
    for (const f of found) {
      if (!picked[f.external_id]) continue;
      const existing = matchExisting(f);
      if (existing && (mergeChoice[f.external_id] ?? 'update') === 'update') {
        // connect-over-existing: keep the row (its history, earmark, settings) — update the number
        store.updateAsset?.(existing.asset_id, { balance: f.balance, source: 'connected', last_synced: now, institution: f.institution });
      } else {
        store.addAsset?.({ label: f.name, institution: f.institution, kind: f.kind, tax_bucket: f.tax_bucket, balance: f.balance, source: 'connected', last_synced: now });
      }
    }
    router.replace('/(tabs)/analytics' as any);
  };

  const equalDoors = (
    <View style={s.doorRow}>
      <TouchableOpacity accessibilityRole="button" style={s.doorBtn} onPress={() => router.push('/import-holdings' as any)}
        accessibilityLabel="Import a file instead">
        <Text style={s.doorTxt}>Import a file</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" style={s.doorBtn} onPress={() => router.push('/add-account' as any)}
        accessibilityLabel="Add it by hand instead">
        <Text style={s.doorTxt}>Add by hand</Text>
      </TouchableOpacity>
    </View>
  );

  // ── step: pick the institution ──
  if (step === 'institution') {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>Connect an account</Text>
        <Text style={s.sub}>Read-only: we can look, never touch your money.</Text>
        {provider ? (
          <>
            <TextInput style={s.input} placeholder="Search your bank or brokerage" placeholderTextColor={Colors.textTertiary}
              value={query} onChangeText={setQuery} accessibilityLabel="Search your bank or brokerage" />
            <View style={s.card}>
              {names.map((n, i) => (
                <TouchableOpacity accessibilityRole="button" key={n} style={[s.instRow, i > 0 && s.divider]}
                  onPress={() => { setInstitution(n); setStep('consent'); }}
                  accessibilityLabel={`${n}. Opens what happens to your data.`}>
                  <Text style={s.instTxt}>{n}</Text>
                  <Text style={s.chev}>›</Text>
                </TouchableOpacity>
              ))}
              {names.length === 0 && query.length > 0 && <Text style={s.note}>No matches — try a shorter name, or use a door below.</Text>}
            </View>
          </>
        ) : (
          <View style={s.card}>
            <Text style={s.line}>Bank linking isn't switched on in this version yet — it arrives in an update, and we'd rather tell you that than show a button that doesn't work.</Text>
            <Text style={s.note}>The file import gets you the same result today in about two minutes.</Text>
          </View>
        )}
        <Text style={s.equalHdr}>Just as good, no login:</Text>
        {equalDoors}
      </ScrollView>
    );
  }

  // ── step: the honest consent ──
  if (step === 'consent') {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity accessibilityRole="button" onPress={() => setStep('institution')} accessibilityLabel="Back to the institution list">
          <Text style={s.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.h1}>Before you connect {institution}</Text>
        <View style={s.card}>
          {CONSENT_COPY.map((c) => (
            <View key={c} style={s.consentRow}>
              <Text style={s.consentDot}>·</Text>
              <Text style={s.line}>{c}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy} onPress={startLink}
          accessibilityLabel={`Continue to ${institution}'s own sign-in`}>
          {busy ? <ActivityIndicator color={Colors.white} /> : <Text style={s.primaryTxt}>Continue to {institution}'s sign-in</Text>}
        </TouchableOpacity>
        <Text style={s.note}>Sign-in happens on {provider?.displayName ?? 'the connection service'} — never inside this app.</Text>
        <Text style={s.equalHdr}>Rather not connect?</Text>
        {equalDoors}
      </ScrollView>
    );
  }

  // ── step: accounts found + the merge gate ──
  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Found at {institution}</Text>
      <Text style={s.sub}>Pick what to track. Anything that looks like an account you already have becomes an update, not a twin.</Text>
      <View style={s.card}>
        {found.map((f, i) => {
          const on = !!picked[f.external_id];
          const existing = matchExisting(f);
          return (
            <View key={f.external_id} style={i > 0 ? s.divider : undefined}>
              <TouchableOpacity accessibilityRole="checkbox" style={s.foundRow} accessibilityState={{ checked: on }}
                onPress={() => setPicked({ ...picked, [f.external_id]: !on })}
                accessibilityLabel={`${f.name}${f.mask ? `, ending ${f.mask.replace(/•/g, '')}` : ''}, ${maskedMoney(Math.round(f.balance))}. ${on ? 'Will be tracked.' : 'Not tracked.'}`}>
                <View style={[s.checkBadge, on && s.checkBadgeOn]}>{on ? <Text style={s.checkTick}>✓</Text> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={s.foundName}>{f.name} {f.mask ?? ''}</Text>
                </View>
                {/* the balance is how you recognize YOUR account — first-class, never a gray footnote */}
                <Text style={s.foundBal}>{maskedMoney(Math.round(f.balance))}</Text>
              </TouchableOpacity>
              {on && existing && (
                <View style={s.mergeBox}>
                  <Text style={s.mergeQ}>You already track a {institution} {String(existing.kind)} ({existing.label}).</Text>
                  {(['update', 'new'] as const).map((v) => (
                    <TouchableOpacity accessibilityRole="radio" key={v} style={s.mergeOpt}
                      accessibilityState={{ selected: (mergeChoice[f.external_id] ?? 'update') === v }}
                      onPress={() => setMergeChoice({ ...mergeChoice, [f.external_id]: v })}
                      accessibilityLabel={v === 'update' ? 'Update the one you have — keeps its history and settings' : 'Add as a new, separate account'}>
                      <Text style={s.mergeTxt}>{(mergeChoice[f.external_id] ?? 'update') === v ? '◉' : '○'}  {v === 'update' ? 'Update the one I have (keeps history)' : 'Add as new — it really is separate'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
      {(() => { const n = Object.values(picked).filter(Boolean).length; return (
        <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, n === 0 && { opacity: 0.4 }]} disabled={n === 0} onPress={save}
          accessibilityLabel={n === 0 ? 'Select an account to track' : `Track ${n} accounts`}>
          <Text style={s.primaryTxt}>{n === 0 ? 'Select an account to track' : `Track ${n} account${n === 1 ? '' : 's'}`}</Text>
        </TouchableOpacity>
      ); })()}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  back: { color: Colors.primary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.md, lineHeight: 20 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.md },
  input: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: Spacing.md, fontSize: 16, color: Colors.textPrimary, marginBottom: Spacing.sm },
  instRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 48 },
  instTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  chev: { fontSize: 18, color: Colors.textTertiary },
  divider: { borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  line: { fontSize: 15, color: Colors.textPrimary, lineHeight: 21, flex: 1 },
  note: { fontSize: 12.5, color: Colors.textTertiary, marginTop: 4, lineHeight: 17 },
  consentRow: { flexDirection: 'row', gap: 8, paddingVertical: 6 },
  consentDot: { fontSize: 15, color: Colors.primaryDark, fontWeight: '800' },
  foundBal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'], marginLeft: 8 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  equalHdr: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.lg, marginBottom: 8 },
  doorRow: { flexDirection: 'row', gap: 10 },
  doorBtn: { flex: 1, backgroundColor: Colors.cardBg, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  doorTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 56 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: Colors.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  checkBadgeOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkTick: { color: Colors.white, fontSize: 14, fontWeight: '800' },
  foundName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  mergeBox: { backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: 8 },
  mergeQ: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  mergeOpt: { paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
  mergeTxt: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
});
