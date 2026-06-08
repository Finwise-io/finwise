// Goals & Debt — save-by-date goals with progress, and an avalanche/snowball debt-payoff plan.
// The pre-retirement (30yo) home for "what am I working toward and how do I kill my debt".
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useStore, type Goal } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { moneyCompact } from '../domain/_shared/money';
import { payoffPlan, totalDebtMonthly, debtToIncome, type PayoffMethod, type Debt } from '../domain/debt';
import { availableToSaveSummary, sinkingFund } from '../domain/goals';
import { incomeMonthlyGrid, totalGrossAnnual } from '../domain/income';
import { spendBuckets } from '../domain/budget';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const monthsToDate = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); };
const GOAL_ICONS = ['🎯', '🏠', '🚗', '✈️', '🎓', '💍', '👶', '🏖️', '🛟', '💰'];

export default function GoalsScreen() {
  const store = useStore() as any;
  const goals: Goal[] = store.goals ?? [];
  const liabilities: Debt[] = store.liabilities ?? [];
  const [edit, setEdit] = useState<Goal | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [method, setMethod] = useState<PayoffMethod>('avalanche');
  const [extra, setExtra] = useState('');

  const op = store.onboardingProfile ?? {};
  const capacity = useMemo(() => availableToSaveSummary(incomeMonthlyGrid(op, 'available')), [op]);
  const sink = useMemo(() => sinkingFund(spendBuckets(op).non_monthly), [op]);
  const hasSinkingGoal = goals.some((g) => /non-?monthly|sinking/i.test(g.label));
  const totalDebt = liabilities.reduce((t, d) => t + d.remaining_balance, 0);
  const grossMonthly = totalGrossAnnual(op) / 12;
  const homeowner = liabilities.some((d) => d.debt_type === 'MORTGAGE');
  const dti = useMemo(() => debtToIncome(totalDebtMonthly(liabilities), grossMonthly, homeowner), [liabilities, grossMonthly, homeowner]);
  const plan = useMemo(() => payoffPlan(liabilities, num(extra), method), [liabilities, extra, method]);
  const planMin = useMemo(() => payoffPlan(liabilities, 0, method), [liabilities, method]);
  const savedInterest = Math.max(0, planMin.totalInterest - plan.totalInterest);
  const soonerMonths = Math.max(0, planMin.months - plan.months);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Goals & Debt</Text>

      {/* WHAT YOU CAN SAVE */}
      {capacity.avg > 0 && (
        <View style={styles.capCard}>
          <Text style={styles.capVal}>{money(capacity.avg)}/mo</Text>
          <Text style={styles.capLab}>typical free cash to save{capacity.lumpy ? ` · ranges ${money(capacity.min)}–${money(capacity.max)} (some months free up more)` : ''}</Text>
        </View>
      )}

      {/* GOALS */}
      <Text style={styles.section}>YOUR GOALS</Text>
      {sink.monthly > 0 && !hasSinkingGoal && (
        <View style={styles.suggestCard}>
          <Text style={styles.suggestTitle}>💡 Suggested: a sinking fund</Text>
          <Text style={styles.suggestSub}>Your non-monthly costs (travel, gifts, repairs) run ~{money(sink.annual)}/yr. Save {money(sink.monthly)}/mo into a fund so they never blow the budget.</Text>
          <TouchableOpacity onPress={() => store.addGoal({ label: 'Non-monthly fund', icon: '🛟', target: sink.annual, saved: 0, duration: '12', color: Colors.primary })}>
            <Text style={styles.suggestCta}>Create this goal ›</Text>
          </TouchableOpacity>
        </View>
      )}
      {goals.length === 0 && (
        <View style={styles.card}><Text style={styles.empty}>No goals yet. Save toward what matters — an emergency fund, a home, a trip.</Text></View>
      )}
      {goals.map((g) => {
        const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
        const remaining = Math.max(0, g.target - g.saved);
        const mo = num(g.duration);
        const perMonth = mo > 0 ? remaining / mo : 0;
        return (
          <TouchableOpacity key={g.id} style={styles.card} onPress={() => setEdit(g)}>
            <View style={styles.goalHead}>
              <Text style={styles.goalIcon}>{g.icon || '🎯'}</Text>
              <Text style={styles.goalName}>{g.label}</Text>
              <Text style={styles.goalPct}>{Math.round(pct)}%</Text>
            </View>
            <View style={styles.bar}><View style={[styles.barFill, { width: `${pct}%`, backgroundColor: g.color || Colors.primary }]} /></View>
            <Text style={styles.goalSub}>{money(g.saved)} of {money(g.target)} · {money(remaining)} to go{perMonth > 0 ? ` · ~${money(perMonth)}/mo for ${mo} mo` : ''}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add a goal</Text></TouchableOpacity>

      {/* DEBT-TO-INCOME */}
      {liabilities.length > 0 && grossMonthly > 0 && (
        <>
          <Text style={styles.section}>DEBT-TO-INCOME</Text>
          <View style={styles.card}>
            <View style={styles.dtiHead}>
              <Text style={[styles.dtiPct, { color: dti.status === 'good' ? Colors.primary : dti.status === 'caution' ? Colors.amber : Colors.red }]}>{Math.round(dti.ratio * 100)}%</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.dtiTitle}>{dti.status === 'good' ? 'Healthy' : dti.status === 'caution' ? 'Getting high' : 'High'}</Text>
                <Text style={styles.dtiSub}>{money(dti.monthlyDebt)}/mo in debt payments ÷ {money(dti.grossMonthly)}/mo income</Text>
              </View>
            </View>
            <Text style={styles.note}>{homeowner ? 'Aim for 36% or less (homeowners, incl. mortgage).' : 'Aim for 20% or less (renters; rent isn\'t counted).'} {dti.status !== 'good' ? 'Paying debt down lowers this.' : 'You\'re in good shape.'}</Text>
          </View>
        </>
      )}

      {/* DEBT PAYOFF */}
      {liabilities.length > 0 && (
        <>
          <Text style={styles.section}>DEBT PAYOFF PLAN</Text>
          <View style={styles.card}>
            <View style={styles.segRow}>
              <TouchableOpacity style={[styles.seg, method === 'avalanche' && styles.segOn]} onPress={() => setMethod('avalanche')}><Text style={[styles.segT, method === 'avalanche' && styles.segTOn]}>Avalanche</Text><Text style={styles.segSub}>least interest</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.seg, method === 'snowball' && styles.segOn]} onPress={() => setMethod('snowball')}><Text style={[styles.segT, method === 'snowball' && styles.segTOn]}>Snowball</Text><Text style={styles.segSub}>quick wins</Text></TouchableOpacity>
            </View>
            <Text style={styles.note}>{method === 'avalanche' ? 'Pays the highest-interest debt first — least total interest.' : 'Pays the smallest balance first — fast momentum.'}</Text>

            <View style={styles.dRow}><Text style={styles.dL}>Extra / month (beyond minimums)</Text></View>
            <View style={styles.amtBox}><Text style={styles.amtPre}>$</Text><TextInput style={styles.amtIn} keyboardType="decimal-pad" value={extra} onChangeText={setExtra} placeholder="0" placeholderTextColor={Colors.textTertiary} /></View>

            {plan.neverPaysOff ? (
              <Text style={[styles.note, { color: Colors.red, fontWeight: '700' }]}>⚠ Minimum payments don't cover the interest — add extra to make progress.</Text>
            ) : (
              <View style={styles.resultBox}>
                <Text style={styles.resultBig}>Debt-free in {plan.months} mo</Text>
                <Text style={styles.resultSub}>around {monthsToDate(plan.months)} · {money(totalDebt)} across {liabilities.length} debt{liabilities.length > 1 ? 's' : ''}</Text>
                <Text style={styles.resultSub}>Total interest: {money(plan.totalInterest)}</Text>
                {num(extra) > 0 && savedInterest > 0 && <Text style={[styles.resultSub, { color: Colors.primary, fontWeight: '700' }]}>Your extra saves {money(savedInterest)} interest{soonerMonths > 0 ? ` & ${soonerMonths} mo` : ''} vs minimums.</Text>}
              </View>
            )}

            {plan.order.length > 0 && (
              <>
                <Text style={[styles.dL, { marginTop: 12, fontWeight: '800', color: Colors.textPrimary }]}>Payoff order</Text>
                {plan.order.map((o, i) => (
                  <View key={o.debt_id} style={styles.orderRow}>
                    <Text style={styles.orderNum}>{i + 1}</Text>
                    <Text style={styles.orderName}>{o.label}</Text>
                    <Text style={styles.orderMo}>paid off {monthsToDate(o.payoffMonth)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </>
      )}

      <View style={{ height: 40 }} />
      <GoalEditor goal={addOpen ? null : edit} open={addOpen || edit != null} onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(g) => { if (edit) store.updateGoal(edit.id, g); else store.addGoal(g); setAddOpen(false); setEdit(null); }}
        onDelete={edit ? () => { store.deleteGoal(edit.id); setEdit(null); } : undefined} />
    </ScrollView>
  );
}

function GoalEditor({ goal, open, onClose, onSave, onDelete }: {
  goal: Goal | null; open: boolean; onClose: () => void; onSave: (g: Omit<Goal, 'id'>) => void; onDelete?: () => void;
}) {
  const [label, setLabel] = useState('');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [months, setMonths] = useState('');
  const [icon, setIcon] = useState('🎯');
  React.useEffect(() => {
    if (!open) return;
    setLabel(goal?.label ?? ''); setTarget(goal ? String(goal.target) : ''); setSaved(goal ? String(goal.saved) : '');
    setMonths(goal?.duration ? String(num(goal.duration)) : ''); setIcon(goal?.icon || '🎯');
  }, [open]);
  const valid = label.trim() && num(target) > 0;
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%' }}>
          <Text style={styles.sheetT}>{goal ? 'Edit goal' : 'New goal'}</Text>
          <View style={styles.iconWrap}>{GOAL_ICONS.map((ic) => (
            <TouchableOpacity key={ic} style={[styles.iconChip, icon === ic && styles.iconChipOn]} onPress={() => setIcon(ic)}><Text style={{ fontSize: 20 }}>{ic}</Text></TouchableOpacity>
          ))}</View>
          <Text style={styles.fieldL}>Goal</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Emergency fund, House down payment" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Target amount</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={target} onChangeText={setTarget} placeholder="0" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Saved so far</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={saved} onChangeText={setSaved} placeholder="0" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Reach it in (months, optional)</Text>
          <TextInput style={styles.input} keyboardType="number-pad" value={months} onChangeText={setMonths} placeholder="e.g. 18" placeholderTextColor={Colors.textTertiary} />
          {valid && num(months) > 0 && <Text style={styles.note}>~{money(Math.max(0, (num(target) - num(saved)) / num(months)))}/mo to hit it.</Text>}
          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid}
            onPress={() => onSave({ label: label.trim(), target: num(target), saved: num(saved), duration: months ? String(num(months)) : undefined, icon, color: Colors.primary })}>
            <Text style={styles.saveBtnT}>{goal ? 'Save' : 'Add goal'}</Text>
          </TouchableOpacity>
          {onDelete && <TouchableOpacity onPress={onDelete}><Text style={styles.deleteLink}>Delete goal</Text></TouchableOpacity>}
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 20, marginBottom: 6 },
  dtiHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dtiPct: { fontSize: 30, fontWeight: '800' },
  dtiTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  dtiSub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 1 },
  capCard: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: 14 },
  capVal: { fontSize: 22, fontWeight: '800', color: Colors.primaryDark },
  capLab: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  suggestCard: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  suggestTitle: { fontSize: 14, fontWeight: '800', color: Colors.textPrimary },
  suggestSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 17 },
  suggestCta: { fontSize: 13.5, fontWeight: '800', color: Colors.primary, marginTop: 8 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 10 },
  empty: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalIcon: { fontSize: 18 },
  goalName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  goalPct: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  bar: { height: 8, borderRadius: 4, backgroundColor: Colors.bgTertiary, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  goalSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 6 },
  addLink: { fontSize: 13.5, fontWeight: '700', color: Colors.primary, marginTop: 2 },

  segRow: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 9, alignItems: 'center' },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13.5, fontWeight: '800', color: Colors.textSecondary },
  segTOn: { color: Colors.primaryDark },
  segSub: { fontSize: 10, color: Colors.textTertiary, marginTop: 1 },
  note: { fontSize: 11.5, color: Colors.textSecondary, lineHeight: 16, marginTop: 8 },
  dRow: { marginTop: 12 },
  dL: { fontSize: 12.5, color: Colors.textSecondary, fontWeight: '600' },
  amtBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 12, marginTop: 6 },
  amtPre: { fontSize: 16, color: Colors.textSecondary },
  amtIn: { flex: 1, padding: 11, fontSize: 16, color: Colors.textPrimary },
  resultBox: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 12, marginTop: 12 },
  resultBig: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  resultSub: { fontSize: 12.5, color: Colors.textSecondary, marginTop: 3 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.bgTertiary },
  orderNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primaryLight, color: Colors.primaryDark, fontWeight: '800', fontSize: 12, textAlign: 'center', lineHeight: 22, overflow: 'hidden' },
  orderName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: Colors.textPrimary },
  orderMo: { fontSize: 11.5, color: Colors.textTertiary },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  iconWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  iconChip: { width: 40, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  iconChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
