// Tax Organizer — a year-end summary + tailored document checklist you can hand your accountant.
// Reviewable in-app; "Share PDF" builds an HTML→PDF and opens the share sheet (needs a native build;
// degrades to a friendly message in Expo Go).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useStore } from '../store/useStore';
import { SectionBand } from '../components/SectionBand';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import type { TaxOrganizer } from '../domain/planning';
import { investmentIncomeAnnual } from '../domain/transactions';
import { interestIncomeAnnual } from '../domain/bonds';
import { useRouter } from 'expo-router';
import { theTaxOrganizer } from '../../MoneyKeel/functions/cashflow/tax-organizer';

export default function TaxOrganizerScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const year = new Date().getFullYear();
  const [busy, setBusy] = useState(false);

  // ONE DOOR (MK-CF-O-007 theTaxOrganizer, Q-CF-5). It shares the tax function with what sets the
  // band on your pay (rule 2: ONE tax function), so it is asked through a door rather than assembled
  // here beside a second copy of the same arithmetic.
  const org: TaxOrganizer = useMemo(
    () => theTaxOrganizer({ profile: op, accounts, debts: liabilities, transactions: store.transactions ?? [], year }),
    [op, accounts, liabilities, store.transactions, year]);

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
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Tax organizer · {year}</Text>
      <Text style={styles.sub}>A summary to hand your accountant — income, accounts, and the documents to gather. Not a tax return.</Text>

      <TouchableOpacity style={[styles.share, busy && { opacity: 0.5 }]} disabled={busy} onPress={sharePdf}>
        <Text style={styles.shareT}>{busy ? 'Preparing…' : '⬇  Share as PDF'}</Text>
      </TouchableOpacity>

      {/* PRD F9#14: filing status + optional flat state rate — every tax ESTIMATE in the app
          (withholding, Roth, capital gains, the RMD drag) reads these two answers */}
      <SectionBand title="HOW YOU FILE" />
      <View style={styles.card}>
        {/* ONE QUESTION, ONE PLACE. These three chips were the only way to set a filing status in the
            whole app — and married-filing-separately was not among them, though its table exists. The
            question now lives on its own screen, asked in onboarding where people pass through, and
            this shows the answer and opens it. Founder ruling 2026-08-27 (mock income-v5, 4a-4c). */}
        <TouchableOpacity accessibilityRole="button" style={styles.fileRow}
          accessibilityLabel="How you file your taxes — change it"
          onPress={() => router.push('/filing-status')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fileNow}>{FILING_WORDS[(store.onboardingProfile?.filingStatus ?? 'single') as string] ?? 'Single'}</Text>
            {!store.onboardingProfile?.filingStatus && (
              <Text style={styles.fileHint}>Assumed — we have never asked</Text>
            )}
          </View>
          <Text style={styles.fileGo}>Change ›</Text>
        </TouchableOpacity>
        <Text style={styles.fieldL}>State income tax % (optional — leave blank for no state tax)</Text>
        <TextInput style={styles.stateInput} keyboardType="decimal-pad" placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          value={String(store.onboardingProfile?.stateTaxRate ?? '')}
          onChangeText={(t: string) => store.setOnboardingProfile?.({ ...(store.onboardingProfile ?? {}), stateTaxRate: t })}
          accessibilityLabel="State income tax percent, optional" />
        <Text style={styles.tinyNote}>These tune every tax estimate in the app — withholding, Roth conversions, capital gains, required-withdrawal taxes. Estimates, not tax advice.</Text>
      </View>

      {/* income */}
      <SectionBand title="INCOME" />
      <View style={styles.card}>
        {org.income.map((l) => (
          <View key={l.label} style={styles.row}>
            <Text style={styles.rowL}>{l.label}{!l.taxable ? <Text style={styles.tag}>  tax-free</Text> : null}</Text>
            <Text style={styles.rowV}>{money(l.amount)}</Text>
          </View>
        ))}
        {/* Q46 (founder ruling 2026-09-08): the four lines a return shows, in order */}
        <View style={[styles.row, styles.total]}><Text style={styles.totalL}>Gross income</Text><Text style={styles.totalV}>{money(org.steps.grossIncome)}</Text></View>
        <View style={styles.row}><Text style={styles.rowL}>401(k) contribution</Text><Text style={styles.rowV}>− {money(org.steps.preTaxContributions)}</Text></View>
        <View style={styles.row}><Text style={styles.rowL}>Standard deduction{org.steps.deductionIncludes.length ? <Text style={styles.tag}>  includes {org.steps.deductionIncludes.join(' and ')}</Text> : null}</Text><Text style={styles.rowV}>− {money(org.steps.standardDeduction)}</Text></View>
        <View style={[styles.row, styles.total]}><Text style={styles.totalL}>Taxable income</Text><Text style={styles.totalV}>{money(org.steps.taxableIncome)}</Text></View>
        {org.nonTaxableTotal > 0 && <View style={styles.row}><Text style={styles.rowL}>Non-taxable</Text><Text style={styles.rowV}>{money(org.nonTaxableTotal)}</Text></View>}
        <Text style={styles.note}>Est. effective federal rate ~{Math.round(org.estTaxRate * 100)}%. Figures are your entries/estimates — verify against your official forms.</Text>
      </View>

      {/* contributions */}
      {org.contributions.length > 0 && (
        <>
          <SectionBand title="RETIREMENT CONTRIBUTIONS" />
          <View style={styles.card}>
            {org.contributions.map((c) => <View key={c.label} style={styles.row}><Text style={styles.rowL}>{c.label}</Text><Text style={styles.rowV}>{money(c.amount)}</Text></View>)}
          </View>
        </>
      )}

      {/* accounts */}
      {org.accounts.length > 0 && (
        <>
          <SectionBand title="ACCOUNTS (year-end)" />
          <View style={styles.card}>
            {org.accounts.map((ac, i) => <View key={i} style={styles.row}><Text style={styles.rowL}>{ac.label} <Text style={styles.tag}>{ac.kind}</Text></Text><Text style={styles.rowV}>{money(ac.balance)}</Text></View>)}
          </View>
        </>
      )}

      {/* documents */}
      <SectionBand title="DOCUMENTS TO GATHER" />
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
      <tr class="total"><td>Gross income</td><td style="text-align:right">$${Math.round(o.steps.grossIncome).toLocaleString()}</td></tr><!-- money-mask-ok: generated HTML export document, not an on-screen display -->
      <tr><td>401(k) contribution</td><td style="text-align:right">− $${Math.round(o.steps.preTaxContributions).toLocaleString()}</td></tr><!-- money-mask-ok: generated HTML export document, not an on-screen display -->
      <tr><td>Standard deduction${o.steps.deductionIncludes.length ? ` (includes ${o.steps.deductionIncludes.join(' and ')})` : ''}</td><td style="text-align:right">− $${Math.round(o.steps.standardDeduction).toLocaleString()}</td></tr><!-- money-mask-ok: generated HTML export document, not an on-screen display -->
      <tr class="total"><td>Taxable income</td><td style="text-align:right">$${Math.round(o.steps.taxableIncome).toLocaleString()}</td></tr></table><!-- money-mask-ok: generated HTML export document, not an on-screen display -->
    ${o.contributions.length ? `<h2>RETIREMENT CONTRIBUTIONS</h2><table>${rows(o.contributions)}</table>` : ''}
    ${o.accounts.length ? `<h2>ACCOUNTS (YEAR-END)</h2><table>${rows(o.accounts.map((a) => ({ label: `${a.label} (${a.kind})`, amount: a.balance })))}</table>` : ''}
    <h2>DOCUMENTS TO GATHER</h2><ul>${o.documents.map((d) => `<li>${d}</li>`).join('')}</ul>
    <div class="foot">Estimates from your entries — verify against official forms (W-2, 1099s, 1098s). Not tax advice.</div>
  </body></html>`;
}

const FILING_WORDS: Record<string, string> = {
  single: 'Single', married: 'Married, filing jointly',
  mfs: 'Married, filing separately', hoh: 'Head of household',
};

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  fileRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 8 },
  fileNow: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  fileHint: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  fileGo: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  fileChip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, minHeight: 42, justifyContent: 'center', backgroundColor: Colors.cardBg },
  fileChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  fileChipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  fieldL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 12, marginBottom: 5 },
  stateInput: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 10, fontSize: 17, color: Colors.textPrimary, width: 120 },
  tinyNote: { fontSize: 11, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 10, lineHeight: 19 },
  share: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 13, alignItems: 'center' },
  shareT: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  section: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 18, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  rowV: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  tag: { fontSize: 13, color: Colors.textTertiary, fontWeight: '600' },
  total: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 },
  totalL: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, flex: 1 },
  totalV: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  note: { fontSize: 11, color: Colors.textTertiary, marginTop: 8, lineHeight: 15 },
  doc: { fontSize: 13, color: Colors.textPrimary, paddingVertical: 3, lineHeight: 18 },
  foot: { fontSize: 11, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 14 },
});
