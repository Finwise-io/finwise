// The LIVE connect flow (design v2 §2, founder-approved) — rendered by ConnectFlowScreen when the
// SnapTrade relay is configured. Steps: pick your brokerage (everything supported, honestly
// labeled) → the HONESTY CARD (what this broker shares / can't share — approved decision 4) →
// the approved consent copy → the broker's own sign-in in the system browser (their docs: never
// a WebView) → sync → confirm any ambiguous tax wrappers. Unsupported institutions are listed
// honestly with the by-hand path — never a dead end.
import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { CONSENT_COPY } from '../services/sync';
import { snaptradeApi } from '../services/sync/snaptradeClient';
import { runSnapTradeSync } from '../services/sync/snaptradeSync';
import { BROKER_COVERAGE, UNSUPPORTED_INSTITUTIONS, UNSUPPORTED_FALLBACK, COVERAGE_AS_OF, type BrokerCoverage } from '../constants/brokerCoverage';

const WRAPPER_CHOICES = [
  ['brokerage', 'TAXABLE', 'Taxable'], ['401k', 'PRE_TAX', '401(k)'], ['trad_ira', 'PRE_TAX', 'Traditional IRA'], ['roth_ira', 'ROTH', 'Roth'],
] as const;

export default function SnapTradeConnect({ reconnectId }: { reconnectId?: string }) {
  const router = useRouter();
  const store = useStore() as any;
  const [step, setStep] = useState<'pick' | 'card' | 'consent' | 'syncing' | 'review' | 'confirm'>(
    ((store.wrapperConfirmQueue ?? []).length > 0) ? 'confirm' : 'pick');
  const [arrived, setArrived] = useState<any[]>([]);
  const [broker, setBroker] = useState<BrokerCoverage | null>(null);
  const [busy, setBusy] = useState(false);
  const queue: string[] = store.wrapperConfirmQueue ?? [];
  const accounts = store.assetAccounts ?? [];
  // runtime flags (design §2.1): a broker in maintenance/degraded gets a temporary warning ON TOP
  // of its curated honesty card. Best-effort — a failed lookup changes nothing.
  const [runtimeFlags, setRuntimeFlags] = useState<Record<string, { maintenance: boolean; degraded: boolean }>>({});
  useEffect(() => {
    let live = true;
    snaptradeApi.brokerages?.().then((list: any[]) => {
      if (!live || !Array.isArray(list)) return;
      const map: Record<string, { maintenance: boolean; degraded: boolean }> = {};
      for (const b of list) map[String(b.slug ?? '').toUpperCase()] = { maintenance: !!b.maintenance, degraded: !!b.degraded };
      setRuntimeFlags(map);
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const openPortal = async () => {
    setBusy(true);
    try {
      const redirect = Linking.createURL('connect-done');
      const { redirectURI } = await snaptradeApi.loginUrl({
        ...(reconnectId ? { reconnect: reconnectId } : broker ? { broker: broker.slug } : {}),
        customRedirect: redirect,
      });
      if (!redirectURI) throw new Error('No sign-in link came back.');
      // System in-app browser (their docs: WebViews break bank sign-ins). The redirect deep-links
      // back; if the user just closes the browser we land in 'dismiss' — treated as abandoned.
      const res = await WebBrowser.openAuthSessionAsync(redirectURI, redirect);
      if (res.type === 'success' && /status=SUCCESS/i.test(res.url ?? '')) {
        setStep('syncing');
        await runSnapTradeSync({ force: true });
        const now = useStore.getState() as any;
        setArrived((now.assetAccounts ?? []).filter((a: any) => a.source === 'connected'));
        setStep('review');
      } else if (res.type === 'success' && /status=ERROR/i.test(res.url ?? '')) {
        Alert.alert("That didn't go through", 'The brokerage sign-in reported a problem. Nothing was connected — you can try again.');
      }
      // dismissed/abandoned → stay here quietly; nothing happened, nothing to clean up
    } catch (e) {
      Alert.alert('Could not start the connection', (e as Error).message);
    } finally { setBusy(false); }
  };

  if (reconnectId) {
    // repair flow: straight to the portal with the reconnect id (same brokerage login)
    return (
      <View style={s.card}>
        <Text style={s.h2}>Re-link this connection</Text>
        <Text style={s.body}>Your brokerage asked to be signed in again — that's them being careful, not a problem with your data.</Text>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} disabled={busy} onPress={openPortal}
          accessibilityLabel="Open your brokerage's sign-in to re-link">
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>Sign in and re-link ›</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'pick') {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionBand title="PICK YOUR BROKERAGE" />
        {BROKER_COVERAGE.map((b) => (
          <TouchableOpacity accessibilityRole="button" key={b.slug} style={[s.row, b.tier === 'gated' && { opacity: 0.55 }]}
            disabled={b.tier === 'gated'}
            onPress={() => { setBroker(b); setStep('card'); }}
            accessibilityLabel={`${b.name}${b.tier === 'alpha' ? ', early access' : b.tier === 'gated' ? ', coming soon' : ''}. Shows what it shares.`}>
            <Text style={s.rowTxt}>{b.name}</Text>
            {(runtimeFlags[b.slug]?.maintenance || runtimeFlags[b.slug]?.degraded) && (
              <Text style={s.tierTag}>{runtimeFlags[b.slug]?.maintenance ? 'down for maintenance' : 'running slow'}</Text>
            )}
            {b.tier === 'alpha' && <Text style={s.tierTag}>early access</Text>}
            {b.tier === 'gated' && <Text style={s.tierTag}>coming soon</Text>}
            <Text style={s.chev}>›</Text>
          </TouchableOpacity>
        ))}
        <SectionBand title="NOT CONNECTABLE YET" />
        {UNSUPPORTED_INSTITUTIONS.map((u) => (
          <View key={u.name} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTxtMuted}>{u.name}</Text>
              <Text style={s.note}>{u.why} — {UNSUPPORTED_FALLBACK}</Text>
            </View>
          </View>
        ))}
        <Text style={s.foot}>Coverage checked {COVERAGE_AS_OF}.</Text>
      </ScrollView>
    );
  }

  if (step === 'card' && broker) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* the HONESTY CARD — founder decision 4: what this broker does and does not share */}
        <SectionBand title={broker.name} />
        <View style={s.card}>
          <SectionBand title={`WHAT ${broker.name.toUpperCase()} SHARES`} />
          {broker.shares.map((line) => <Text key={line} style={s.body}>·  {line}</Text>)}
          {broker.cantShare.length > 0 && (
            <>
              <Text style={[s.kicker, { marginTop: 10 }]}>WHAT IT CAN'T SHARE</Text>
              {broker.cantShare.map((line) => <Text key={line} style={s.body}>·  {line}</Text>)}
              <Text style={s.note}>Anything you add by hand stays and counts — nothing gets overwritten.</Text>
            </>
          )}
          {broker.caveat && <Text style={s.caveat}>{broker.caveat}</Text>}
        </View>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} onPress={() => setStep('consent')}
          accessibilityLabel="Continue to what happens to your data">
          <Text style={s.primaryTxt}>Continue ›</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={s.quietBtn} onPress={() => setStep('pick')} accessibilityLabel="Pick a different brokerage">
          <Text style={s.quietTxt}>‹ Different brokerage</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'consent' && broker) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.h2}>What happens to your data</Text>
        <View style={s.card}>
          {CONSENT_COPY.map((line) => <Text key={line} style={s.body}>·  {line}</Text>)}
        </View>
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn} disabled={busy} onPress={openPortal}
          accessibilityLabel={`Open ${broker.name}'s own sign-in`}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>Open {broker.name}'s sign-in ›</Text>}
        </TouchableOpacity>
        <Text style={s.note}>The sign-in happens on {broker.name}'s own page, in your browser — we never see your password.</Text>
      </ScrollView>
    );
  }

  if (step === 'review') {
    const queueNow: string[] = (useStore.getState() as any).wrapperConfirmQueue ?? [];
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.h2}>Here's what came in</Text>
        {arrived.map((a: any) => (
          <View key={a.asset_id} style={s.row} accessible
            accessibilityLabel={`${a.label} ${a.mask ?? ''}, tracked`}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTxt}>{a.label} {a.mask ?? ''}</Text>
              <Text style={s.note}>{a.institution}{a.status && a.status !== 'open' ? ` · ${a.status}` : ''}</Text>
            </View>
          </View>
        ))}
        {arrived.length === 0 && <Text style={s.body}>No accounts came back yet — first-time history can take a minute. Pull again from Home shortly.</Text>}
        <TouchableOpacity accessibilityRole="button" style={s.primaryBtn}
          onPress={() => { if (queueNow.length > 0) setStep('confirm'); else router.replace('/(tabs)/analytics' as any); }}
          accessibilityLabel={queueNow.length > 0 ? 'Continue — one question about account types' : 'Done — see your net worth'}>
          <Text style={s.primaryTxt}>{queueNow.length > 0 ? 'Continue ›' : 'See your net worth ›'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'syncing') {
    return (
      <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[s.body, { marginTop: 12 }]}>Bringing your accounts in…</Text>
        <Text style={s.note}>First-time history can take a minute.</Text>
      </View>
    );
  }

  // step 'confirm' — the wrapper question (SnapTrade has no normalized 401(k)/IRA/Roth label;
  // wrong wrapper = wrong tax math, so we ask instead of guessing)
  const pending = accounts.filter((a: any) => queue.includes(a.asset_id));
  // audit fix P2-1: navigation is an EFFECT, never a render side-effect
  useEffect(() => {
    if (step === 'confirm' && pending.length === 0) router.replace('/(tabs)/analytics' as any);
  }, [step, pending.length]);
  if (pending.length === 0) return null;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={s.h2}>One quick check</Text>
      <Text style={s.body}>Your brokerage didn't say what kind of account these are. The type changes the tax math, so pick it here:</Text>
      {pending.map((a: any) => (
        <View key={a.asset_id} style={s.card}>
          <Text style={s.rowTxt}>{a.label} {a.mask ?? ''}</Text>
          <View style={s.chipRow}>
            {WRAPPER_CHOICES.map(([kind, bucket, label]) => (
              <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: false }} key={kind}
                style={s.chip} accessibilityLabel={`${a.label} is a ${label} account`}
                onPress={() => store.confirmAccountWrapper?.(a.asset_id, kind, bucket)}>
                <Text style={s.chipTxt}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h2: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 4 },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7, marginTop: 14, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, borderRadius: Radii.md, paddingHorizontal: Spacing.md, minHeight: 52, marginTop: 6, gap: 8 },
  rowTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowTxtMuted: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  tierTag: { fontSize: 11, fontWeight: '800', color: Colors.amber, backgroundColor: Colors.amberLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  chev: { fontSize: 20, color: Colors.textTertiary },
  body: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  caveat: { fontSize: 13, fontWeight: '700', color: Colors.amber, marginTop: 10, lineHeight: 18 },
  foot: { fontSize: 11, color: Colors.textTertiary, marginTop: 12, marginBottom: 24 },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  quietBtn: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  quietTxt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
});
