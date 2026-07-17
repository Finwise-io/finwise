// Tax Organizer — a year-end summary + tailored document checklist you can hand your accountant.
// Reviewable in-app; "Share PDF" builds an HTML→PDF and opens the share sheet (needs a native build;
// degrades to a friendly message in Expo Go).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { taxOrganizer, type TaxOrganizer } from '../domain/planning';
import { investmentIncomeAnnual } from '../domain/transactions';
import { interestIncomeAnnual } from '../domain/bonds';

export default function TaxOrganizerScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const year = new Date().getFullYear();
  const [busy, setBusy] = useState(false);

  const org: TaxOrganizer = useMemo(() => {
    const actualPassive = Math.round(investmentIncomeAnnual(store.transactions ?? []) + interestIncomeAnnual(accounts));
    return taxOrganizer(op, { accounts, liabilities, actualPassive, year });
  }, [op, accounts, liabilities, year]);

  const sharePdf = async () => {
    setBusy(true);
    try {
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({ html: orgToHtml(org) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Tax organizer' });
      else Alert.alert('Saved', `PDF saved to:\n${uri}`);
    } catch (e: any) {
      Alert.alert('Export needs the full app', 'PDF export works in the installed app build, not the Expo Go preview. Everything above is your organizer — you can screenshot it for now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Tax organizer · {year}</Text>
      <Text style={styles.sub}>A summary to hand your accountant — income, accounts, and the documents to gather. Not a tax return.</Text>

      <TouchableOpacity style={[styles.share, busy && { opacity: 0.5 }]} disabled={busy} onPress={sharePdf}>
        <Text style={styles.shareT}>{busy ? 'Preparing…' : '⬇  Share as PDF'}</Text>
      </TouchableOpacity>

      {/* PRD F9#14: filing status + optional flat state rate — every tax ESTIMATE in the app
          (withholding, Roth, capital gains, the RMD drag) reads these two answers */}
      <Text style={styles.section}>HOW YOU FILE</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {([['single', 'Single'], ['married', 'Married, filing jointly'], ['hoh', 'Head of household']] as const).map(([v, label]) => {
            const on = (store.onboardingProfile?.filingStatus ?? 'single') === v;
            return (
              <TouchableOpacity accessibilityRole="radio" key={v}
                style={[styles.fileChip, on && styles.fileChipOn]}
                accessibilityState={{ selected: on }} accessibilityLabel={label}
                onPress={() => store.setOnboardingProfile?.({ ...(store.onboardingProfile ?? {}), filingStatus: v })}>
                <Text style={[styles.fileChipTxt, on && { color: Colors.primaryDark }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fieldL}>State income tax % (optional — leave blank for no state tax)</Text>
        <TextInput style={styles.stateInput} keyboardType="decimal-pad" placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          value={String(store.onboardingProfile?.stateTaxRate ?? '')}
          onChangeText={(t: string) => store.setOnboardingProfile?.({ ...(store.onboardingProfile ?? {}), stateTaxRate: t })}
          accessibilityLabel="State income tax percent, optional" />
        <Text style={styles.tinyNote}>These tune every tax estimate in the app — withholding, Roth conversions, capital gains, required-withdrawal taxes. Estimates, not tax advice.</Text>
      </View>

      {/* income */}
      <Text style={styles.section}>INCOME</Text>
      <View style={styles.card}>
        {org.income.map((l) => (
          <View key={l.label} style={styles.row}>
            <Text style={styles.rowL}>{l.label}{!l.taxable ? <Text style={styles.tag}>  tax-free</Text> : null}</Text>
            <Text style={styles.rowV}>{money(l.amount)}</Text>
          </View>
        ))}
        <View style={[styles.row, styles.total]}><Text style={styles.totalL}>Taxable income</Text><Text style={styles.totalV}>{money(org.taxableTotal)}</Text></View>
        {org.nonTaxableTotal > 0 && <View style={styles.row}><Text style={styles.rowL}>Non-taxable</Text><Text style={styles.rowV}>{money(org.nonTaxableTotal)}</Text></View>}
        <Text style={styles.note}>Est. effective federal rate ~{Math.round(org.estTaxRate * 100)}%. Figures are your entries/estimates — verify against your official forms.</Text>
      </View>

      {/* contributions */}
      {org.contributions.length > 0 && (
        <>
          <Text style={styles.section}>RETIREMENT CONTRIBUTIONS</Text>
          <View style={styles.card}>
            {org.contributions.map((c) => <View key={c.label} style={styles.row}><Text style={styles.rowL}>{c.label}</Text><Text style={styles.rowV}>{money(c.amount)}</Text></View>)}
          </View>
        </>
      )}

      {/* accounts */}
      {org.accounts.length > 0 && (
        <>
          <Text style={styles.section}>ACCOUNTS (year-end)</Text>
          <View style={styles.card}>
            {org.accounts.map((ac, i) => <View key={i} style={styles.row}><Text style={styles.rowL}>{ac.label} <Text style={styles.tag}>{ac.kind}</Text></Text><Text style={styles.rowV}>{money(ac.balance)}</Text></View>)}
          </View>
        </>
      )}

      {/* documents */}
      <Text style={styles.section}>DOCUMENTS TO GATHER</Text>
      <View style={styles.card}>
        {org.documents.map((d) => <Text key={d} style={styles.doc}>•  {d}</Text>)}
      </View>

      <Text style={styles.foot}>This is an organizer, not a filed return or tax advice. Your accountant will use your official documents (W-2, 1099s, 1098s, etc.) — this helps you both prepare.</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function orgToHtml(o: TaxOrganizer): string {
  const rows = (lines: { label: string; amount: number }[]) =>
    lines.map((l) => `<tr><td>${l.label}</td><td style="text-align:right">$${Math.round(l.amount).toLocaleString()}</td></tr>`).join(''); // money-mask-ok: generated HTML export document the user shares with their accountant, not an on-screen display
  return `<html><head><meta name="viewport" content="width=device-width"><style>
    body{font-family:-apple-system,Helvetica,Arial;padding:28px;color:#1a1a1a}
    h1{font-size:22px;margin:0 0 2px} .sub{color:#666;font-size:12px;margin-bottom:18px}
    h2{font-size:12px;letter-spacing:.5px;color:#888;margin:22px 0 6px}
    table{width:100%;border-collapse:collapse;font-size:13px} td{padding:5px 0;border-bottom:1px solid #eee}
    .total td{font-weight:700;border-top:2px solid #333;border-bottom:none}
    li{font-size:13px;margin:3px 0} .foot{color:#999;font-size:10px;margin-top:24px}
  </style></head><body>
    <h1>Tax Organizer — ${o.year}</h1>
    <div class="sub">Prepared in MoneyKeel · a summary for your accountant, not a tax return</div>
    <h2>INCOME</h2><table>${rows(o.income)}
      <tr class="total"><td>Taxable income</td><td style="text-align:right">$${Math.round(o.taxableTotal).toLocaleString()}</td></tr></table><!-- money-mask-ok: generated HTML export document, not an on-screen display -->
    ${o.contributions.length ? `<h2>RETIREMENT CONTRIBUTIONS</h2><table>${rows(o.contributions)}</table>` : ''}
    ${o.accounts.length ? `<h2>ACCOUNTS (YEAR-END)</h2><table>${rows(o.accounts.map((a) => ({ label: `${a.label} (${a.kind})`, amount: a.balance })))}</table>` : ''}
    <h2>DOCUMENTS TO GATHER</h2><ul>${o.documents.map((d) => `<li>${d}</li>`).join('')}</ul>
    <div class="foot">Estimates from your entries — verify against official forms (W-2, 1099s, 1098s). Not tax advice.</div>
  </body></html>`;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  fileChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, minHeight: 42, justifyContent: 'center', backgroundColor: Colors.cardBg },
  fileChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  fileChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  fieldL: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary, marginTop: 12, marginBottom: 5 },
  stateInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 10, fontSize: 16, color: Colors.textPrimary, width: 120 },
  tinyNote: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 10, lineHeight: 19 },
  share: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 13, alignItems: 'center' },
  shareT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 18, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  rowV: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  tag: { fontSize: 12, color: Colors.textTertiary, fontWeight: '600' },
  total: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  totalL: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  totalV: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  note: { fontSize: 11, color: Colors.textTertiary, marginTop: 8, lineHeight: 15 },
  doc: { fontSize: 13, color: Colors.textPrimary, paddingVertical: 3, lineHeight: 18 },
  foot: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
