// Import holdings from a brokerage CSV export. Pick a file → preview what we read → add it as a new
// investment account built from those holdings (derive_balance:true, per B-60 the balance is rebuilt
// from positions). User-added (no origin:'onboarding'), so re-running onboarding never touches it.
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../store/useStore';
import { importHoldings, type ImportResult } from '../domain/import/holdingsImport';
import { newEntityId } from '../domain/_shared/ids';
import { round2 } from '../domain/_shared/num';
import { Colors, Spacing, Radii, Typography } from '../utils/theme';

const todayIso = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ImportHoldingsScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const [result, setResult] = useState<ImportResult | null>(null);
  const [accountName, setAccountName] = useState('Imported holdings');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickFile() {
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', 'text/plain', 'application/vnd.ms-excel'],
      });
      if (res.canceled || !res.assets?.[0]) return;
      setBusy(true);
      const text = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = importHoldings(text);
      if (parsed.holdings.length === 0) {
        setError('We couldn\'t find any holdings in that file. Make sure it\'s a CSV with a symbol/ticker column and a quantity/shares column.');
        setResult(null);
      } else {
        setResult(parsed);
      }
    } catch (e: any) {
      setError('We couldn\'t read that file. Your data is safe — try exporting a CSV from your brokerage and pick it again.');
    } finally {
      setBusy(false);
    }
  }

  function confirmImport() {
    if (!result || result.holdings.length === 0) return;
    setBusy(true);
    try {
      const positions = result.holdings.map((h) => ({
        position_id: newEntityId('pos'),
        ticker: h.ticker,
        label: h.label,
        kind: 'stocks_etf',
        lots: [{
          lot_id: newEntityId('lot'),
          shares: h.shares,
          cost_per_share: round2(h.costPerShare),
          purchase_date: h.date || todayIso(),
        }],
      }));
      // Seed the balance with cost basis so it shows immediately; refreshPrices() refines it to market value.
      const costBasis = round2(result.holdings.reduce((t, h) => t + h.shares * h.costPerShare, 0));
      store.addAsset({
        label: accountName.trim() || 'Imported holdings',
        kind: 'brokerage',
        tax_bucket: 'TAXABLE',
        balance: costBasis,
        target_return: 0.08,
        positions,
        derive_balance: true,
      });
      store.refreshPrices?.();   // best-effort: pull live prices so market value populates
      Alert.alert('Holdings imported 🎉', `Added ${positions.length} holding${positions.length === 1 ? '' : 's'} to "${accountName.trim() || 'Imported holdings'}".`, [
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
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Review your holdings</Text>
        <Text style={styles.sub}>
          Found <Text style={styles.bold}>{result.holdings.length}</Text> holding{result.holdings.length === 1 ? '' : 's'}
          {result.skipped > 0 ? ` · skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} we couldn't read` : ''}.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Account name</Text>
          <TextInput style={styles.input} value={accountName} onChangeText={setAccountName} placeholder="Imported holdings" placeholderTextColor={Colors.textTertiary} accessibilityLabel="Account name" />
        </View>

        <View style={styles.card}>
          <View style={[styles.row, styles.rowHead]}>
            <Text style={[styles.cTicker, styles.headTxt]}>Ticker</Text>
            <Text style={[styles.cShares, styles.headTxt]}>Shares</Text>
            <Text style={[styles.cCost, styles.headTxt]}>Cost/share</Text>
          </View>
          {result.holdings.map((h, i) => (
            <View key={i} style={[styles.row, i < result.holdings.length - 1 && styles.rowBorder]}>
              <Text style={styles.cTicker}>{h.ticker}</Text>
              <Text style={styles.cShares}>{h.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</Text>
              <Text style={styles.cCost}>{h.costPerShare > 0 ? fmt(h.costPerShare) : '—'}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>🔒 Imported holdings are encrypted like everything else. Prices update once you open Net Worth or Investments.</Text>

        <TouchableOpacity style={[styles.primary, busy && { opacity: 0.6 }]} onPress={confirmImport} disabled={busy} accessibilityRole="button" accessibilityLabel={`Add ${result.holdings.length} holdings`}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Add {result.holdings.length} holding{result.holdings.length === 1 ? '' : 's'}</Text>}
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
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
  cTicker: { flex: 1.2, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cShares: { flex: 1, fontSize: 14, color: Colors.textSecondary, textAlign: 'right' },
  cCost: { flex: 1.2, fontSize: 14, color: Colors.textSecondary, textAlign: 'right' },
  note: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: 12 },
  error: { fontSize: 13.5, color: Colors.red, lineHeight: 19, marginBottom: Spacing.base, textAlign: 'center' },
  primary: { backgroundColor: Colors.primary, borderRadius: Radii.pill, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: 6 },
  primaryTxt: { color: '#fff', fontWeight: '800', fontSize: Typography.sizes.md },
  secondary: { paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  secondaryTxt: { color: Colors.primary, fontWeight: '700', fontSize: Typography.sizes.md },
});
