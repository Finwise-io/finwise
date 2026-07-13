// Cash Flow detail (#15): the breakdown behind the Home cash-flow box, a month-by-month projection of
// take-home vs spending and the resulting surplus (forward-looking — the onboarding grid projects the
// whole year), and this month's planned-vs-actual. All numbers come from the same canonical helpers the
// Home box and budget use (annualCashflow / savingsByMonth / incomeMonthlyGrid / spendByMonth /
// budgetVsActual), so nothing here can diverge from the rest of the app.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { annualCashflow, spendByMonth, budgetVsActual } from '../domain/budget';
import { surplusByMonth, monthlySavings } from '../domain/savings';   // canonical AFTER-debt surplus
import { actualDebtPayment } from '../domain/debt';
import { incomeMonthlyGrid } from '../domain/income';
import { PaycheckCard } from '../components/PaycheckCard';
import { QuickAddExpense, ExpenseFab } from '../components/MoneySheets';
import { resolveLens } from '../domain/profile/lens';

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CashFlowScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const expenses = store.expenses ?? [];
  const liabilities = store.liabilities ?? [];
  const lens = resolveLens(op, store.lensOverride);
  const [sheet, setSheet] = useState(false);
  const customCats = useMemo(() => (Array.isArray(op?.spendCats) ? op.spendCats : []).filter((c: any) => c?.custom && c?.label), [op]);
  const now = new Date();

  const cf = useMemo(() => annualCashflow(op), [op]);
  // Surplus is AFTER debt (2026-06-23 decision) — same canonical definition as Home & Budget.
  const surplus = useMemo(() => surplusByMonth(op, liabilities), [op, liabilities]);   // [{label, amount}] × 12
  const plannedSurplusMo = useMemo(() => Math.round(monthlySavings(op, liabilities)), [op, liabilities]);
  const surplusYr = useMemo(() => Math.round(surplus.reduce((t, m) => t + m.amount, 0)), [surplus]);
  const takeHome = useMemo(() => incomeMonthlyGrid(op, 'available'), [op]); // take-home by month
  const spend = useMemo(() => spendByMonth(op), [op]);                      // planned spend by month
  const bva = useMemo(() => budgetVsActual(expenses, op, new Date()), [expenses, op]);

  const moMax = Math.max(1, ...takeHome.map((m) => m.amount), ...spend);
  const surMax = Math.max(1, ...surplus.map((m) => Math.abs(m.amount)));
  const debtMo = Math.round(actualDebtPayment(liabilities));   // monthly debt service (what leaves your account)

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* FCC: the retired lens leads with the paycheck — the F5 hero, no flag (approved design) */}
      {lens === 'retired' && <PaycheckCard />}
      <Text style={styles.h1}>Cash flow</Text>
      <Text style={styles.sub}>Where your money goes each month — and what's left to save. Projected from your income and spending plan.</Text>

      {/* ── This month: the breakdown ── */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>A TYPICAL MONTH</Text>
        <Row label="Net pay (after tax)" value={money(Math.round(cf.netYr / 12))} />
        <Row label="− 401(k)" value={money(Math.round(cf.k401Yr / 12))} dim />
        <Row label="− Spending" value={money(Math.round(cf.spendYr / 12))} dim />
        {debtMo > 0 && <Row label="− Debt payments" value={money(debtMo)} dim />}
        <View style={styles.divider} />
        <Row label="= Planned surplus" value={money(plannedSurplusMo)} strong color={plannedSurplusMo >= 0 ? Colors.primary : Colors.red} />
        <Text style={styles.note}>Planned surplus is your take-home minus 401(k), spending{debtMo > 0 ? ', and debt payments' : ''} — the money free to save or invest.</Text>
      </View>

      {/* ── Surplus by month (projected) ── */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>PLANNED SURPLUS, MONTH BY MONTH</Text>
        <Text style={styles.cardSub}>Projected for the year · {money(surplusYr)} total</Text>
        <View style={styles.chart}>
          {surplus.map((m) => (
            <View key={m.label} style={styles.col}>
              <View style={styles.barWrap}>
                <View style={[styles.bar, {
                  height: `${Math.max(2, (Math.abs(m.amount) / surMax) * 100)}%`,
                  backgroundColor: m.amount >= 0 ? Colors.primary : Colors.red,
                }]} />
              </View>
              <Text style={styles.colLbl}>{m.label[0]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Income vs spending by month ── */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>TAKE-HOME vs SPENDING</Text>
        <View style={styles.legendRow}>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.primary }]} /><Text style={styles.legendT}>Take-home</Text></View>
          <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.amber }]} /><Text style={styles.legendT}>Spending</Text></View>
        </View>
        <View style={styles.chart}>
          {takeHome.map((m, i) => (
            <View key={m.label} style={styles.col}>
              <View style={styles.pairWrap}>
                <View style={[styles.pairBar, { height: `${Math.max(2, (m.amount / moMax) * 100)}%`, backgroundColor: Colors.primary }]} />
                <View style={[styles.pairBar, { height: `${Math.max(2, (spend[i] / moMax) * 100)}%`, backgroundColor: Colors.amber }]} />
              </View>
              <Text style={styles.colLbl}>{m.label[0]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── This month: planned vs actual ── */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>THIS MONTH · PLANNED vs ACTUAL</Text>
        <Row label="Planned spend" value={money(Math.round(bva.planned_total))} />
        <Row label="Actual so far" value={money(Math.round(bva.spent_total))} color={bva.spent_total > bva.planned_total ? Colors.red : Colors.textPrimary} />
        <View style={styles.track}>
          <View style={[styles.fill, {
            width: `${Math.min(100, bva.planned_total > 0 ? (bva.spent_total / bva.planned_total) * 100 : 0)}%`,
            backgroundColor: bva.spent_total > bva.planned_total ? Colors.red : Colors.primary,
          }]} />
        </View>
        <Text style={styles.note}>
          {bva.spent_total > bva.planned_total
            ? `${money(Math.round(bva.spent_total - bva.planned_total))} over plan so far this month.`
            : `${money(Math.round(bva.planned_total - bva.spent_total))} left of this month's plan.`}
        </Text>
      </View>
    </ScrollView>

    {/* '+ Expense' (M4): same corner, same label as Home — one habit, one spot */}
    <ExpenseFab onPress={() => setSheet(true)} />
    <QuickAddExpense visible={sheet} onClose={() => setSheet(false)} customCats={customCats}
      isCurrentMonth baseDate={now} monthLabel={`${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`} />
    </View>
  );
}

function Row({ label, value, dim, strong, color }: { label: string; value: string; dim?: boolean; strong?: boolean; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowL, dim && { color: Colors.textSecondary }, strong && { fontWeight: '800' }]}>{label}</Text>
      <Text style={[styles.rowV, strong && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.base, paddingBottom: 48 },
  h1: { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.base, lineHeight: 19 },
  card: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  cardSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { fontSize: Typography.sizes.base, color: Colors.textPrimary },
  rowV: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  note: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 3, marginTop: Spacing.sm },
  col: { flex: 1, alignItems: 'center' },
  barWrap: { height: 100, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 2 },
  pairWrap: { height: 100, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  pairBar: { width: 5, borderRadius: 2, minHeight: 2 },
  colLbl: { fontSize: 9, color: Colors.textTertiary, marginTop: 3 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendT: { fontSize: 12, color: Colors.textSecondary },
  track: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, overflow: 'hidden', marginTop: 8 },
  fill: { height: '100%', borderRadius: 4 },
});
