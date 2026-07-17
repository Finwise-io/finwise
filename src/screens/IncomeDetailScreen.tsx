// Income detail — displays the full breakdown the Income module captures:
// each source (salary, bonus, RSUs, signing, rental) with its cadence, the totals,
// the effective tax rate, and the 12-month cash-flow grid (lumpy bonus/RSU months).
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { incomeFromOnboarding, buildIncomeState, equityCashFlow } from '../domain/income';
import { investmentIncomeAnnual } from '../domain/transactions';
import { interestIncomeAnnual } from '../domain/bonds';

const CADENCE: Record<string, string> = {
  MONTHLY: '/mo', ANNUAL: '/yr', QUARTERLY: '/qtr', WEEKLY: '/wk', BIWEEKLY: '/2wk', ONETIME: 'one-time',
};
// P0 (design audit ID-1): single-letter axis had three J's and two M's — unreadable ambiguity.
// 3-letter labels on alternating months keep the axis legible without crowding.
const MONTHS = ['Jan', '', 'Mar', '', 'May', '', 'Jul', '', 'Sep', '', 'Nov', ''];

export default function IncomeDetailScreen() {
  const store = useStore() as any;
  const router = useRouter();
  const op = store.onboardingProfile;
  const uid = store.user?.uid ?? 'local';

  // Prefer ACTUAL passive income from holdings (recorded dividends/interest + bond coupons) over the
  // onboarding estimate, so totals reflect real money once the user has holdings.
  const actualPassive = useMemo(
    () => Math.round(investmentIncomeAnnual(store.transactions ?? []) + interestIncomeAnnual(store.assetAccounts ?? [])),
    [store.transactions, store.assetAccounts],
  );
  const opLive = useMemo(() => (actualPassive > 0 ? { ...op, invAnnual: actualPassive } : op), [op, actualPassive]);

  const { sources, state } = useMemo(() => {
    const doc = incomeFromOnboarding(uid, opLive);
    return { sources: doc.sources, state: buildIncomeState(uid, doc.sources, doc.tax) };
  }, [opLive, uid]);

  // Equity vesting cash flow (RSUs / options), with a view + amount toggle.
  const equityFlow = useMemo(() => equityCashFlow(op), [op]);
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [amount, setAmount] = useState<'gross' | 'net'>('gross');
  const netFactor = 1 - state.effective_tax_rate;
  const equityAmt = (gross: number) => (amount === 'net' ? gross * netFactor : gross);
  const equityMax = Math.max(...equityFlow.map((f) => f.amount), 1);

  if (!sources.length) {
    return (
      <View style={[styles.root, { padding: Spacing.lg }]}>
        <Text style={styles.sub}>No income captured yet. Run setup to add your salary, bonus, RSUs, and more.</Text>
        <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', marginTop: 8 }} onPress={() => router.push('/income-manager')}
          accessibilityLabel="Add your income"><Text style={{ fontSize: 15, fontWeight: '700', color: Colors.primary }}>Add your income ›</Text></TouchableOpacity>
      </View>
    );
  }

  const maxMonth = Math.max(...state.monthly_cash_flow_grid.map((c) => c.gross), 1);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ padding: Spacing.lg }}>
      {/* totals */}
      <View style={styles.card}>
        {/* the headline fact leads (audit ID-2): net income as the hero, not a same-size row */}
        <Text style={styles.heroK}>NET INCOME / YEAR</Text>
        <Text style={styles.heroV}>{money(state.total_net_annual)}</Text>
        <Row label="Gross / year" value={money(state.total_gross_annual)} bold />
        <Row label="Effective tax rate" value={`${(state.effective_tax_rate * 100).toFixed(1)}%`} />
        <View style={styles.divider} />
        <Row label="Net / month" value={`${money(state.net_monthly_income)}/mo`} />
        {state.employer_match_annual > 0 && <Row label="Employer 401(k) match" value={`${money(state.employer_match_annual)}/yr`} />}
      </View>

      {/* sources */}
      <Text style={styles.section}>Sources</Text>
      <View style={styles.card}>
        {sources.map((src) => (
          <View key={src.income_source_id} style={styles.srcRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.srcLabel}>{src.label}</Text>
              <Text style={styles.fx}>{labelType(src.income_type)}{src.operating_expenses ? ` · −${money(src.operating_expenses)} expenses` : ''}</Text>
            </View>
            <Text style={styles.srcAmt}>{money(src.gross_amount)}<Text style={styles.per}>{CADENCE[src.frequency]}</Text></Text>
          </View>
        ))}
      </View>

      {/* monthly cash-flow grid */}
      <Text style={styles.section}>Monthly cash flow (gross)</Text>
      <View style={styles.card}>
        <View style={styles.grid}>
          {state.monthly_cash_flow_grid.map((c, i) => (
            <View key={i} style={styles.col}>
              <View style={styles.barWrap}>
                <View style={[styles.bar, { height: `${Math.max(3, (c.gross / maxMonth) * 100)}%` }]} />
              </View>
              <Text style={styles.mLabel}>{MONTHS[i]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.fx}>Bonus, RSUs, and signing bonuses land in their actual months — not smoothed.</Text>
      </View>

      {/* equity vesting cash flow — chart/table + gross/net toggles */}
      {equityFlow.length > 0 && (
        <>
          <Text style={styles.section}>Equity vesting cash flow</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <Toggle options={[['chart', 'Chart'], ['table', 'Table']]} value={view} onChange={(v) => setView(v as any)} />
              <Toggle options={[['gross', 'Gross'], ['net', 'Net']]} value={amount} onChange={(v) => setAmount(v as any)} />
            </View>

            {view === 'chart' ? (
              equityFlow.map((f) => (
                <View key={f.year} style={styles.flowRow}>
                  <Text style={styles.flowYear}>{f.year}</Text>
                  <View style={styles.flowBarTrack}>
                    <View style={[styles.flowBarFill, { width: `${Math.max(4, (f.amount / equityMax) * 100)}%` }]} />
                  </View>
                  <Text style={styles.flowAmt}>{money(equityAmt(f.amount))}</Text>
                </View>
              ))
            ) : (
              <>
                <View style={[styles.tRow, styles.tHead]}>
                  <Text style={[styles.tCell, styles.tHeadTxt]}>Year</Text>
                  <Text style={[styles.tCell, styles.tHeadTxt, styles.tRight]}>{amount === 'net' ? 'Net' : 'Gross'} vesting</Text>
                </View>
                {equityFlow.map((f) => (
                  <View key={f.year} style={styles.tRow}>
                    <Text style={styles.tCell}>{f.year}</Text>
                    <Text style={[styles.tCell, styles.tRight, { fontWeight: '700' }]}>{money(equityAmt(f.amount))}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={styles.fx}>
              {amount === 'net'
                ? `Net of your ~${(state.effective_tax_rate * 100).toFixed(1)}% effective rate — equity is taxed as ordinary income at vesting.`
                : 'Gross value as each grant vests. Toggle to Net for after-tax.'}
            </Text>
          </View>
        </>
      )}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// Compact segmented toggle (two or more options).
function Toggle({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.toggle}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <TouchableOpacity key={v} style={[styles.toggleBtn, on && styles.toggleBtnOn]} onPress={() => onChange(v)}>
            <Text style={[styles.toggleTxt, on && styles.toggleTxtOn]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function labelType(t: string) {
  return ({ W2_JOB: 'Job income', LONG_TERM_RENTAL: 'Long-term rental', SHORT_TERM_RENTAL: 'Short-term rental', OTHER: 'Other' } as any)[t] ?? t;
}
function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowVal, bold && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  sub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  section: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Spacing.md, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: Colors.textSecondary },
  rowVal: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  heroK: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7 },
  heroV: { fontSize: 30, fontWeight: '800', color: Colors.primaryDark, fontVariant: ['tabular-nums'], marginBottom: 8 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  srcRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  srcLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  srcAmt: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  per: { fontSize: 11, fontWeight: '600', color: Colors.textTertiary },
  fx: { fontSize: 11, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 4 },
  grid: { flexDirection: 'row', alignItems: 'flex-end', height: 110, gap: 4 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barWrap: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: Colors.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  mLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 3 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  toggle: { flexDirection: 'row', backgroundColor: Colors.bgSecondary, borderRadius: Radii.md, padding: 3 },
  toggleBtn: { paddingHorizontal: 14, borderRadius: Radii.sm, minHeight: 44, justifyContent: 'center' },
  toggleBtnOn: { backgroundColor: Colors.cardBg, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  toggleTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  toggleTxtOn: { color: Colors.primary, fontWeight: '700' },
  flowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  flowYear: { fontSize: 13, color: Colors.textSecondary, width: 42 },
  flowBarTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, overflow: 'hidden' },
  flowBarFill: { height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  flowAmt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, width: 72, textAlign: 'right' },
  tRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tHead: { borderBottomWidth: 1.5 },
  tHeadTxt: { fontWeight: '700', color: Colors.textTertiary, fontSize: 12, textTransform: 'uppercase' },
  tCell: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  tRight: { textAlign: 'right' },
});
