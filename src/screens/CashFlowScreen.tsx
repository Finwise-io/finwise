// Cash flow main (FCC detailed design v1.1, Cash flow sheet) — ONE screen, lens-switched:
//   retired → the paycheck told truthfully month by month: the F5 hero, 12 dated bars, the
//             draw-order preview, and the will-it-last strip (mirroring its home in Plan)
//   working → today's real cash flow (in/out/surplus, after debt), the same dated bars, and the
//             future-paycheck PROJECTION card (same F5 engine, projection mode, estimate-labeled)
// Every by-month number is an F2/F5 cell — this screen computes NOTHING of its own.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Typography, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { budgetVsActual } from '../domain/budget';
import { monthlySavings } from '../domain/savings';
import { actualDebtPayment } from '../domain/debt';
import { retirementIncomeMonthly } from '../domain/income';
import { taxBucketSplit, withdrawalOrder } from '../domain/decumulation';
import { simulate } from '../domain/retirement';
import { selectWillItLast, willItLastInputs, chanceWord } from '../domain/retirement/willItLast';
import { DrawSteerSheet } from '../components/DrawSteerSheet';
import { buildPaycheckYear } from '../domain/paycheck';
import { resolveNetWorthRows } from '../domain/snapshot';
import { ageFromProfile } from '../utils/persona';
import { PaycheckCard } from '../components/PaycheckCard';
import { QuickAddExpense, ExpenseFab } from '../components/MoneySheets';
import { useCashflowModel } from '../hooks/useCashflowModel';
import { maskedMoney } from '../components/useMoney';

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CashFlowScreen() {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const uid = store.user?.uid ?? 'local';
  const expenses = store.expenses ?? [];
  const liabilities = store.liabilities ?? [];
  const [sheet, setSheet] = useState(false);
  const [whyOrder, setWhyOrder] = useState(false);
  const customCats = useMemo(() => (Array.isArray(op?.spendCats) ? op.spendCats : []).filter((c: any) => c?.custom && c?.label), [op]);
  const now = new Date();

  // the ONE model — the same cells the hero card, month rows and month detail read
  const { lens, year, grid } = useCashflowModel();

  const bva = useMemo(() => budgetVsActual(expenses, op, now), [expenses, op]);
  const { accounts } = useMemo(
    () => resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []),
    [uid, op, store.nwSeeded, store.assetAccounts, store.liabilities]);

  // will-it-last strip mirrors Plan (the one selector — identical seeded run)
  const wil = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: store.retirementAssumptions ?? {}, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, store.retirementAssumptions, store.inflationRate, store.employmentStatus]);

  const header = `${MONTHS_LONG[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bgSecondary }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headRow}>
        <Text style={styles.h1}>Cash flow</Text>
        <Text style={styles.headDate}>{header}</Text>
      </View>

      {lens === 'retired' ? (
        <RetiredMain year={year} accounts={accounts} bva={bva} onWhyOrder={() => { setWhyOrder(true); (useStore.getState() as any).setTransitionCheck?.('drawOrder', true); }} />
      ) : (
        <WorkingMain grid={grid} bva={bva} op={op} liabilities={liabilities} store={store} />
      )}

      {/* BY MONTH — the dated 12 cells; tap a month for its detail */}
      <View style={styles.card}>
        <Text style={styles.cardHdr}>BY MONTH · {grid.cells[0]?.label} – {grid.cells[11]?.label}</Text>
        <MonthBars lens={lens} year={year} grid={grid} onOpen={(slot) => router.push(`/month-detail?slot=${slot}` as any)} />
        <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/bill-calendar')}
          accessibilityLabel="All bills and the calendar">
          <Text style={styles.link}>All bills & the calendar ›</Text>
        </TouchableOpacity>
      </View>

      {/* will-it-last strip — mirrors Plan, never a second computation */}
      <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
        accessibilityLabel={wil.chance != null ? `Will my money last: ${chanceWord(wil.chance)}, ${wil.chance} percent, an estimate. Lives in your Plan.` : 'See your odds in Plan'}>
        <Text style={styles.cardHdr}>WILL MY MONEY LAST?</Text>
        {wil.chance != null
          ? <Text style={styles.wilTxt}>{chanceWord(wil.chance)} — {wil.chance}% <Text style={styles.wilEst}>estimate</Text></Text>
          : <Text style={styles.note}>Answer 3 quick questions in Plan to see your odds</Text>}
        <Text style={styles.link}>Lives in your Plan ›</Text>
      </TouchableOpacity>
    </ScrollView>

    {/* '+ Expense' (M4): same corner, same label as Home — one habit, one spot */}
    <ExpenseFab onPress={() => setSheet(true)} />
    <QuickAddExpense visible={sheet} onClose={() => setSheet(false)} customCats={customCats}
      isCurrentMonth baseDate={now} monthLabel={header} />

    {/* draw-order 'Why?' — the plain-English text already written in withdrawalOrder */}
    <DrawOrderWhy visible={whyOrder} onClose={() => setWhyOrder(false)} accounts={accounts} op={op} />
    </View>
  );
}

// ── retired: hero + draw-order preview ──────────────────────────────────────────
function RetiredMain({ year, accounts, bva, onWhyOrder }: { year: any; accounts: any[]; bva: any; onWhyOrder: () => void }) {
  const router = useRouter();
  const store = useStore() as any;
  const age = ageFromProfile(store.onboardingProfile) ?? 68;
  const split = taxBucketSplit(accounts);
  const order = withdrawalOrder(split, age, store.drawOrder ?? null);   // the saved steer preference applies
  const [steerOpen, setSteerOpen] = useState(false);
  const m0 = year.months[0];
  const safePool = Math.max(0, Math.round(m0?.netSafeToSpend ?? 0));
  const now = new Date();
  const monthPct = Math.round((now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100);
  const spentPct = safePool > 0 ? Math.round((bva.spent_total / safePool) * 100) : 0;
  return (
    <>
      <PaycheckCard />
      {safePool > 0 && (
        <TouchableOpacity accessibilityRole="button" style={styles.card} activeOpacity={0.85} onPress={() => router.push('/month-detail?slot=0' as any)}
          accessibilityLabel={`Spending pace: ${maskedMoney(Math.round(bva.spent_total))} of ${maskedMoney(safePool)} safe to spend — ${spentPct} percent spent, ${monthPct} percent of the month gone. Opens this month's detail.`}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
            <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
          </View>
          <Text style={styles.note}>Spent {maskedMoney(Math.round(bva.spent_total))} of {maskedMoney(safePool)} safe this month · {spentPct}% spent, {monthPct}% of the month gone ›</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[styles.cardHdr, { flex: 1, marginBottom: 0 }]}>DRAW COMES FROM</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => setSteerOpen(true)} accessibilityLabel="Steer it — reorder where the draw comes from">
            <Text style={styles.link}>Steer it ›</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={onWhyOrder} accessibilityLabel="Why this order?" style={{ marginLeft: 12 }}>
            <Text style={styles.link}>Why? ›</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.orderLine}>
          {order.map((s: any, i: number) => `${i + 1} ${s.label}`).join('   ')}
        </Text>
        <Text style={styles.note}>{store.drawOrder ? 'Your order — steered by you. Balances match your Net worth.' : 'The order the math would tap your accounts — not a directive. Balances match your Net worth.'}</Text>
      </View>
      <DrawSteerSheet visible={steerOpen} onClose={() => setSteerOpen(false)} />
    </>
  );
}

// ── working: in/out/surplus + spent-so-far + commitments + the projection card ──
function WorkingMain({ grid, bva, op, liabilities, store }: { grid: any; bva: any; op: any; liabilities: any[]; store: any }) {
  const router = useRouter();
  const cell = grid.cells[0];
  const inflow = cell?.inflow ?? 0;
  const outflow = cell?.outflow ?? 0;
  const surplus = Math.round(monthlySavings(op, liabilities));
  const debtMo = Math.round(actualDebtPayment(liabilities));
  const A = store.retirementAssumptions ?? {};

  // Committed from your Plan (F11): adopted commitments visibly reduce free-to-spend
  const commitments = (A.commitments ?? []) as { label: string; monthlyAmount: number }[];
  const committed = commitments.reduce((t, c) => t + (c.monthlyAmount || 0), 0);

  const wilChance = React.useMemo(() => selectWillItLast({
    op, accounts: store.assetAccounts ?? [], assumptions: A,
    inflationRate: store.inflationRate, employmentStatus: store.employmentStatus,
  }).chance, [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);

  // Future paycheck — PROJECTION (same F5 engine, projection mode; estimate label is mandatory copy)
  const projection = React.useMemo(() => {
    const age = ageFromProfile(op);
    const retireAge = A.retireAge ?? (Number(op?.targetRetirementAge) || 67);
    const futureGuaranteed = retirementIncomeMonthly(op);   // the future SS/pension entries
    if (age == null || age >= retireAge) return null;
    const inputs = willItLastInputs({ op, accounts: store.assetAccounts ?? [], assumptions: A, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus });
    if (!inputs || inputs.start_balance <= 0) return null;
    const projectedEgg = simulate(inputs).projected_at_retirement;
    if (!projectedEgg || projectedEgg <= 0) return null;
    const projYear = buildPaycheckYear(op, {
      nestEgg: projectedEgg,
      sim: { current_age: retireAge, horizon_age: Math.max(retireAge + 5, inputs.horizon_age), mean_return: inputs.mean_return, vol_return: inputs.vol_return, inflation: inputs.inflation, seed: 42, paths: 300 },
    });
    return { retireAge, monthly: Math.round(futureGuaranteed + projYear.safeDrawMonthly), guaranteed: Math.round(futureGuaranteed), draw: Math.round(projYear.safeDrawMonthly) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, store.assetAccounts, A, store.inflationRate, store.employmentStatus]);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.cardHdr}>THIS MONTH</Text>
        {(() => { const free = committed > 0 ? surplus - committed : surplus; return (
          <>
            <Text style={[styles.heroNum, { color: free >= 0 ? Colors.primary : Colors.red }]} accessible
              accessibilityLabel={`${free >= 0 ? '' : 'minus '}${maskedMoney(Math.abs(free))} ${committed > 0 ? 'free to spend after your plan' : 'planned surplus'} this month`}>
              {free >= 0 ? '+' : '−'}{maskedMoney(Math.abs(free))}
            </Text>
            <Text style={styles.heroSub}>{committed > 0 ? 'Free to spend after your plan' : 'Planned surplus'}</Text>
          </>
        ); })()}
        <View style={styles.divider} />
        <Row label="In (take-home)" value={maskedMoney(Math.round(inflow))} />
        <Row label={debtMo > 0 ? 'Out (bills + debt)' : 'Out (bills)'} value={maskedMoney(Math.round(outflow))} dim />
        <Row label={committed > 0 ? 'Free to spend after your plan' : '= Planned surplus'}
          value={maskedMoney(committed > 0 ? surplus - committed : surplus)} strong
          color={(committed > 0 ? surplus - committed : surplus) >= 0 ? Colors.primary : Colors.red} />
        {committed > 0 && commitments.map((c, i) => (
          <Row key={i} label={`${c.label} · from your Plan`} value={`−${maskedMoney(c.monthlyAmount)}`} dim />
        ))}
        {(() => {
          const now = new Date();
          const monthPct = Math.round((now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100);
          const spentPct = bva.planned_total > 0 ? Math.round((bva.spent_total / bva.planned_total) * 100) : 0;
          return (
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/month-detail?slot=0' as any)}
              accessibilityLabel={`Spending pace: ${maskedMoney(Math.round(bva.spent_total))} of ${maskedMoney(Math.round(bva.planned_total))} planned — ${spentPct} percent spent, ${monthPct} percent of the month gone. Opens this month's detail.`}>
              <View style={styles.paceTrack}>
                <View style={[styles.paceFill, { width: `${Math.min(100, spentPct)}%`, backgroundColor: spentPct > 100 ? Colors.red : spentPct > monthPct + 10 ? Colors.amber : Colors.primary }]} />
                <View style={[styles.paceMark, { left: `${Math.min(99, monthPct)}%` }]} />
              </View>
              <Text style={styles.note}>Spent {maskedMoney(Math.round(bva.spent_total))} of {maskedMoney(Math.round(bva.planned_total))} planned · {spentPct}% spent, {monthPct}% of the month gone ›</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      {projection && (
        <TouchableOpacity accessibilityRole="button" style={styles.projCard} activeOpacity={0.85} onPress={() => router.push('/(tabs)/plan')}
          accessibilityLabel={`Your future paycheck — a projection, an estimate, not a promise. At ${projection.retireAge}: about ${maskedMoney(projection.monthly)} a month.`}>
          <Text style={styles.cardHdr}>YOUR FUTURE PAYCHECK</Text>
          <Text style={styles.projTag}>PROJECTION — an estimate, not a promise</Text>
          <Text style={styles.projHero}>At {projection.retireAge}:  ~{maskedMoney(projection.monthly)} / mo</Text>
          {projection.guaranteed > 0 && <Row label="Social Security · pension" value={`~${maskedMoney(projection.guaranteed)}`} dim />}
          <Row label="Safe draw from savings" value={`~${maskedMoney(projection.draw)}`} dim />
          {wilChance != null && <Text style={styles.note}>Based on your plan's {wilChance}% odds of lasting · see Plan ›</Text>}
        </TouchableOpacity>
      )}
    </>
  );
}

// ── the dated 12-month bars (both lenses) ───────────────────────────────────────
function MonthBars({ lens, year, grid, onOpen }: { lens: string; year: any; grid: any; onOpen: (slot: number) => void }) {
  const cells = lens === 'retired'
    ? year.months.map((m: any, s: number) => ({
        label: m.label,
        inflow: m.guaranteedTotal + m.safeDraw,
        outflow: m.billsTotal,
        flag: m.billsTotal > 0
          ? `! ${m.bills[0]?.label ?? 'big bill'} −${maskedMoney(Math.round(m.bills[0]?.amount ?? m.billsTotal))}`
          : (m.guaranteedTotal > year.months[0].guaranteedTotal + 0.005
            ? (() => { const extra = m.guaranteedTotal - year.months[0].guaranteedTotal; return `+ ${m.guaranteed.find((g: any) => g.amount > 0)?.source ?? 'extra income'} +${maskedMoney(Math.round(extra))}`; })()
            : null),
        spoken: `${m.label}: ${Math.round(m.guaranteedTotal + m.safeDraw)} dollars in, ${Math.round(m.billsTotal)} out${m.billsTotal > 0 ? `, ${m.bills[0]?.label} due` : ''}`,
      }))
    : grid.cells.map((c: any) => ({
        label: c.label,
        inflow: c.inflow,
        outflow: c.outflow,
        flag: (() => {
          const bonus = c.incomeItems.find((i: any) => i.source === 'Bonus');
          if (bonus) return `+ Bonus ${maskedMoney(Math.round(bonus.amount))}`;
          return c.net < -0.005 ? '! short month' : null;
        })(),
        spoken: `${c.label}: ${Math.round(c.inflow)} dollars in, ${Math.round(c.outflow)} out${c.net < -0.005 ? ', a short month' : ''}`,
      }));
  const max = Math.max(1, ...cells.map((c: any) => Math.max(c.inflow, c.outflow)));
  return (
    <View>
      {cells.map((c: any, s: number) => (
        <TouchableOpacity accessibilityRole="button" key={c.label} style={styles.barRow} onPress={() => onOpen(s)}
          accessibilityLabel={c.spoken} accessibilityHint="Opens this month's detail">
          <Text style={styles.barLabel}>{c.label}</Text>
          <View style={{ flex: 1 }}>
            <View style={styles.barTrack}><View style={[styles.barIn, { width: `${Math.max(2, (c.inflow / max) * 100)}%` }]} /></View>
            <View style={[styles.barTrack, { marginTop: 2 }]}><View style={[styles.barOut, { width: `${Math.max(2, (c.outflow / max) * 100)}%` }]} /></View>
          </View>
          {c.flag && <Text style={styles.barFlag} numberOfLines={1}>{c.flag}</Text>}
        </TouchableOpacity>
      ))}
      <View style={styles.legendRow}>
        <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.primary }]} /><Text style={styles.legendT}>in</Text></View>
        <View style={styles.legend}><View style={[styles.dot, { backgroundColor: Colors.amber }]} /><Text style={styles.legendT}>out</Text></View>
        <Text style={styles.legendT}>· tap a month for detail</Text>
      </View>
    </View>
  );
}

// ── the 'Why this order?' explainer (text already written in withdrawalOrder) ──
function DrawOrderWhy({ visible, onClose, accounts, op }: { visible: boolean; onClose: () => void; accounts: any[]; op: any }) {
  const age = ageFromProfile(op) ?? 68;
  const order = withdrawalOrder(taxBucketSplit(accounts), age);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalT}>Why this order?</Text>
          {order.map((s: any, i: number) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <Text style={styles.whyStep}>{i + 1}. {s.label} — {maskedMoney(s.amount ?? 0)}</Text>
              <Text style={styles.whyTxt}>{s.why}</Text>
            </View>
          ))}
          <TouchableOpacity accessibilityRole="button" style={styles.modalBtn} onPress={onClose}>
            <Text style={styles.modalBtnT}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  content: { padding: Spacing.base, paddingBottom: 110 },
  headRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.sm },
  h1: { fontSize: Typography.sizes.xxl, fontWeight: '800', color: Colors.textPrimary },
  headDate: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.textSecondary },
  card: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base },
  projCard: { backgroundColor: '#fff', borderRadius: Radii.lg, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  cardHdr: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  rowL: { fontSize: Typography.sizes.base, color: Colors.textPrimary },
  rowV: { fontSize: Typography.sizes.base, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 6 },
  heroNum: { fontSize: 34, fontWeight: '800', marginTop: 2 },
  heroSub: { fontSize: 13, color: Colors.textSecondary, fontWeight: '700', marginBottom: 6 },
  paceTrack: { height: 10, borderRadius: 5, backgroundColor: Colors.bgTertiary, marginTop: 10, overflow: 'hidden' },
  paceFill: { height: 10, borderRadius: 5 },
  paceMark: { position: 'absolute', top: -2, width: 2, height: 14, backgroundColor: Colors.textSecondary },
  note: { fontSize: 12, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  link: { fontSize: 13, color: Colors.primary, fontWeight: '700', marginTop: 8 },
  orderLine: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 34, paddingVertical: 2 },
  barLabel: { width: 52, fontSize: 11.5, fontWeight: '700', color: Colors.textSecondary },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: Colors.bgSecondary, overflow: 'hidden' },
  barIn: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  barOut: { height: 8, borderRadius: 4, backgroundColor: Colors.amber },
  barFlag: { fontSize: 10.5, fontWeight: '700', color: Colors.textSecondary, maxWidth: 92 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  legendT: { fontSize: 12, color: Colors.textSecondary },
  wilTxt: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  wilEst: { fontSize: 12, fontWeight: '500', color: Colors.textTertiary },
  projTag: { fontSize: 11, fontWeight: '800', color: Colors.amber, letterSpacing: 0.4, marginBottom: 4 },
  projHero: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, maxHeight: '80%' },
  modalT: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  whyStep: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary },
  whyTxt: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  modalBtn: { alignSelf: 'flex-end', marginTop: 4, padding: 8 },
  modalBtnT: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
});
