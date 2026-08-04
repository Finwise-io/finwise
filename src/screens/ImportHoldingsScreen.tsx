// Import holdings from a brokerage CSV export. Pick a file → preview what we read → add it as a new
// investment account built from those holdings (derive_balance:true, per B-60 the balance is rebuilt
// from positions). User-added (no origin:'onboarding'), so re-running onboarding never touches it.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { readFileString } from '../services/fileRead';   // T19: supported read path (legacy readAsStringAsync throws at runtime)
import { useStore } from '../store/useStore';
import { importHoldings, decodeCsvBase64, matchImportAccount, type ImportResult } from '../domain/import/holdingsImport';
import { ASSET_CLASS_LABEL, type AssetClass, type TaxBucket } from '../domain/assets';
import { newEntityId } from '../domain/_shared/ids';
import { round2, money2 } from '../domain/_shared/num';
import { Colors, Spacing, Radii, Typography } from '../utils/theme';

// Read a picked CSV robustly (#12). UTF-8 is the common case; a UTF-16 / odd-encoding export either
// throws or comes back NUL-laden when read as UTF-8 — in that case re-read the RAW BYTES (base64 never
// fails on encoding) and decode with BOM/UTF-16 detection. This is why "we couldn't read that file" fired.
async function readCsvText(uri: string): Promise<string> {
  let text: string | null = null;
  try {
    text = await readFileString(uri, 'utf8');
  } catch {
    text = null;
  }
  const NUL = String.fromCharCode(0);
  if (text == null || text.length === 0 || text.indexOf(NUL) !== -1) {
    const b64 = await readFileString(uri, 'base64');
    text = decodeCsvBase64(b64);
  }
  return text;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function ImportHoldingsScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const [result, setResult] = useState<ImportResult | null>(null);
  const [accountName, setAccountName] = useState('Imported holdings');
  // Import v2 (FCC): which institution the file came from — powers 'By institution' grouping and
  // the never-double-an-account merge rule. Required before the import button enables.
  const [institution, setInstitution] = useState('');
  const [mergeChoice, setMergeChoice] = useState<'update' | 'new'>('update');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matched = matchImportAccount(store.assetAccounts ?? [], institution);

  // per-row class correction (Import v2): tap a row's class tag to cycle through the choices —
  // the chosen class is saved as the explicit asset_class, which the whole taxonomy honors first.
  const CLASS_CYCLE: AssetClass[] = ['stocks_etf', 'bonds', 'cash', 'alternatives'];
  const cycleClass = (i: number) => {
    if (!result) return;
    const holdings = result.holdings.map((h, k) => {
      if (k !== i) return h;
      const next = CLASS_CYCLE[(CLASS_CYCLE.indexOf(h.assetClass as AssetClass) + 1) % CLASS_CYCLE.length];
      return { ...h, assetClass: next };
    });
    setResult({ ...result, holdings });
  };

  async function pickFile() {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', 'text/plain', 'application/vnd.ms-excel'],
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(true);
      const text = await readCsvText(res.assets[0].uri);
      const parsed = importHoldings(text);
      if (parsed.holdings.length === 0) {
        setError('We couldn\'t find any holdings in that file. Make sure it\'s a CSV with a symbol/ticker column and a quantity/shares column.');
        setResult(null);
      } else {
        setResult(parsed);
        // Default the account name to the security itself when the file is a single equity, so the Net
        // Rule 1 (founder-approved 2026-08-04): NEVER a ticker as an account name — the generic
        // name stays; the institution + type give it its real identity.
      }
    } catch (e: any) {
      // Surface a short technical detail so a remaining failure is self-diagnosing (no more blind rounds).
      const detail = String(e?.message || e || '').slice(0, 140);
      setError('We couldn\'t read that file. Your data is safe — try exporting a CSV from your brokerage and pick it again.'
        + (detail ? `\n\n(Details: ${detail})` : ''));
    } finally {
      setBusy(false);
    }
  }

  function confirmImport() {
    if (!result || result.holdings.length === 0 || !institution.trim()) return;
    setBusy(true);
    try {
      const acctName = accountName.trim() || 'Imported holdings';
      const inst = institution.trim();
      const provenance = { institution: inst, source: 'imported' as const, last_synced: new Date().toISOString() };
      // Equities (tradeable tickers) → one brokerage account with tracked positions.
      const equities = result.holdings.filter((h) => h.assetClass === 'stocks_etf' && h.ticker);
      // Everything else (CD/money-market/cash, bonds, options/alternatives) → manual-balance accounts,
      // each tagged with its asset_class so the taxonomy classifies it correctly.
      const others = result.holdings.filter((h) => !(h.assetClass === 'stocks_etf' && h.ticker));
      let added = 0;

      if (equities.length) {
        const positions = equities.map((h) => ({
          position_id: newEntityId('pos'), ticker: h.ticker, label: h.label, kind: 'stocks_etf',
          lots: [{ lot_id: newEntityId('lot'), shares: h.shares, cost_per_share: round2(h.costPerShare), purchase_date: h.date || todayIso() }],
        }));
        const mktValue = round2(equities.reduce((t, h) => t + (h.value || h.shares * h.costPerShare), 0));
        if (matched && mergeChoice === 'update') {
          // Merge-not-duplicate (Import v2): refresh the existing account — asset_id is preserved,
          // so its history, retirement earmark and class settings survive. Never a twin.
          store.updateAsset(matched.asset_id, {
            positions, balance: mktValue, derive_balance: true, asset_class: 'stocks_etf', ...provenance,
          });
        } else {
          store.addAsset({
            label: acctName, kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf',
            balance: mktValue, target_return: 0.08, positions, derive_balance: true, ...provenance,
          });
        }
        added += equities.length;
      }

      const CLASS_DEFAULTS: Record<AssetClass, { kind: string; tax_bucket: TaxBucket; ret: number }> = {
        cash: { kind: 'savings', tax_bucket: 'CASH', ret: 0.02 },
        bonds: { kind: 'fixed_income', tax_bucket: 'TAXABLE', ret: 0.042 },
        alternatives: { kind: 'other_asset', tax_bucket: 'TAXABLE', ret: 0.05 },
        stocks_etf: { kind: 'stocks_etf', tax_bucket: 'TAXABLE', ret: 0.08 },
        real_estate: { kind: 'home', tax_bucket: 'PROPERTY', ret: 0.04 },
        personal_property: { kind: 'vehicle', tax_bucket: 'PROPERTY', ret: -0.05 },
        mixed: { kind: 'brokerage', tax_bucket: 'TAXABLE', ret: 0.06 },   // importer never emits 'mixed' (it classifies), but the map must be total
      };
      for (const h of others) {
        const def = CLASS_DEFAULTS[h.assetClass];
        // NW-11: keep traded options as 'options' (not the generic 'Other') so they read correctly on Alternatives.
        const kind = h.assetClass === 'alternatives' && /\b(put|call)s?\b/i.test(`${h.symbol} ${h.label}`) ? 'options' : def.kind;
        store.addAsset({
          label: h.label || h.symbol, kind, tax_bucket: def.tax_bucket,
          asset_class: h.assetClass, balance: round2(h.value || 0), target_return: def.ret,
          value_as_of: todayIso(), ...provenance,
        });
        added += 1;
      }

      store.refreshPrices?.();   // best-effort: pull live prices so equity market values populate
      Alert.alert('Holdings imported 🎉', `Added ${added} holding${added === 1 ? '' : 's'} — sorted into cash, investments and more.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Could not import', 'Something went wrong adding those holdings. Please try again.');
      setBusy(false);
    }
  }

  // ── Preview state ──────────────────────────────────────────────
  if (result) {
    return (
      <ScrollView automaticallyAdjustKeyboardInsets style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Review your holdings</Text>
        <Text style={styles.sub}>
          Found <Text style={styles.bold}>{result.holdings.length}</Text> holding{result.holdings.length === 1 ? '' : 's'}
          {result.skipped > 0 ? ` · skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} we couldn't read` : ''}.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Which institution is this file from?</Text>
          <TextInput style={styles.input} value={institution} onChangeText={setInstitution} placeholder="e.g. Vanguard" placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Which institution is this file from" accessibilityHint="Files the account under this institution and prevents duplicates" />
          <Text style={[styles.label, { marginTop: 12 }]}>Account name</Text>
          <TextInput style={styles.input} value={accountName} onChangeText={setAccountName} placeholder="Imported holdings" placeholderTextColor={Colors.textTertiary} accessibilityLabel="Account name" />
        </View>

        {/* merge-not-duplicate: re-importing the same institution updates instead of doubling */}
        {matched && (
          <View style={styles.card}>
            <Text style={styles.mergeHead}>⚑ You already track a “{matched.institution?.trim() || matched.label}” account</Text>
            {([['update', `Update it (no twin) — keeps its history and settings`], ['new', 'Add as a new account']] as const).map(([v, label]) => (
              <TouchableOpacity accessibilityRole="button" key={v} style={[styles.mergeRow, mergeChoice === v && styles.mergeOn]}
                onPress={() => setMergeChoice(v)}
                accessibilityState={{ selected: mergeChoice === v }} accessibilityLabel={label}>
                <Text style={styles.mergeTxt}>{mergeChoice === v ? '◉' : '○'}  {label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.note}>Nothing is ever added twice without asking you.</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={[styles.row, styles.rowHead]}>
            <Text style={[styles.cTicker, styles.headTxt]}>Security</Text>
            <Text style={[styles.cShares, styles.headTxt]}>Shares</Text>
            <Text style={[styles.cCost, styles.headTxt]}>Cost/share</Text>
            <Text style={[styles.cValue, styles.headTxt]}>Value</Text>
          </View>
          {result.holdings.map((h, i) => {
            // NW-3/NW-7: every row shows its dollar VALUE (the only meaningful number for non-equities,
            // whose shares/cost are 0). Wrap the row in one grouped a11y label so a screen reader reads it
            // as a sentence, not three fragments. money2() masks under hide-balances (no privacy leak).
            const name = h.ticker || h.label || h.symbol || '—';
            const classLabel = ASSET_CLASS_LABEL[h.assetClass] ?? h.assetClass;
            return (
              <View
                key={i}
                style={[styles.row, i < result.holdings.length - 1 && styles.rowBorder]}
                accessible
                accessibilityLabel={`${name}, ${classLabel}, ${money2(h.value)}`}
              >
                {/* show a name for EVERY row — non-equities (CD/bond/option) have no ticker, so fall back
                    to the security description/symbol; tag the asset class so the user sees how it classified. */}
                <View style={styles.cTicker}>
                  <Text style={styles.secName} numberOfLines={2}>{name}</Text>
                  {/* Import v2: the class is CORRECTABLE before anything is saved — tap to cycle */}
                  <TouchableOpacity accessibilityRole="button" onPress={() => cycleClass(i)}
                    accessibilityLabel={`${name} classified as ${classLabel} — tap to change`} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.secClassBtn}>{classLabel} ▾</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cShares}>{h.shares > 0 ? h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}</Text>
                <Text style={styles.cCost}>{h.costPerShare > 0 ? money2(h.costPerShare) : '—'}</Text>
                <Text style={styles.cValue}>{money2(h.value)}</Text>
              </View>
            );
          })}
          <View style={[styles.row, styles.rowTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalVal}>{money2(result.holdings.reduce((t, h) => t + h.value, 0))}</Text>
          </View>
        </View>

        <Text style={styles.note}>🔒 The file is read on this device; your saved data syncs encrypted to your cloud backup. Prices update once you open Net Worth or Investments.</Text>

        <TouchableOpacity style={[styles.primary, (busy || !institution.trim()) && { opacity: 0.6 }]} onPress={confirmImport} disabled={busy || !institution.trim()} accessibilityRole="button"
          accessibilityLabel={!institution.trim() ? 'Name the institution first, then import' : `Import ${result.holdings.length} holdings`}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>{!institution.trim() ? 'Name the institution to import' : `Import ${result.holdings.length} holding${result.holdings.length === 1 ? '' : 's'}`}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => { setResult(null); setError(null); }} disabled={busy} accessibilityRole="button" accessibilityLabel="Choose a different file">
          <Text style={styles.secondaryTxt}>Choose a different file</Text>
        </TouchableOpacity>
        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  // ── Intro state ────────────────────────────────────────────────
  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.emoji}>📄</Text>
      <Text style={styles.h1}>Import your holdings</Text>
      <Text style={styles.sub}>
        Upload a CSV export from your brokerage (Fidelity, Schwab, Vanguard, Robinhood, and most others).
        We'll read your tickers, shares, and cost — no logins or passwords.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What we look for</Text>
        <Text style={styles.bullet}>• A <Text style={styles.bold}>Symbol</Text> / Ticker column</Text>
        <Text style={styles.bullet}>• A <Text style={styles.bold}>Quantity</Text> / Shares column</Text>
        <Text style={styles.bullet}>• A <Text style={styles.bold}>Cost basis</Text> column (optional — we'll still import without it)</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={[styles.primary, busy && { opacity: 0.6 }]} onPress={pickFile} disabled={busy} accessibilityRole="button" accessibilityLabel="Choose a file to import">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Choose a file</Text>}
      </TouchableOpacity>
      <Text style={styles.note}>🔒 Your file is read on your device. Nothing is uploaded except your own encrypted data.</Text>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  emoji: { fontSize: 44, textAlign: 'center', marginTop: 8 },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, textAlign: 'center' },
  sub: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: Spacing.lg },
  bold: { fontWeight: '800', color: Colors.textPrimary },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base },
  cardTitle: { fontSize: 13, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4, marginBottom: 8 },
  bullet: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  label: { fontSize: 12.5, fontWeight: '700', color: Colors.textTertiary, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: Typography.sizes.md, color: Colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowHead: { paddingTop: 0, paddingBottom: 8 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  headTxt: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.4 },
  cTicker: { flex: 1.5 },
  secName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  secClass: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  secClassBtn: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark, marginTop: 3, backgroundColor: Colors.primaryLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', overflow: 'hidden' },
  mergeHead: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  mergeRow: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, marginBottom: 6, minHeight: 44, justifyContent: 'center' },
  mergeOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  mergeTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  cShares: { width: 56, fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  cCost: { width: 66, fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  cValue: { width: 78, fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  rowTotal: { paddingTop: 10, paddingBottom: 0, borderTopWidth: 0.5, borderTopColor: Colors.border, justifyContent: 'space-between' },
  totalLabel: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  totalVal: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right' },
  note: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: 12 },
  error: { fontSize: 13, color: Colors.red, lineHeight: 19, marginBottom: Spacing.base, textAlign: 'center' },
  primary: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: 6 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: Typography.sizes.md },
  secondary: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  secondaryTxt: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.md },
});
