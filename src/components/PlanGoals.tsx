// PLAN · GOALS — everything a person saves for other than retiring (brief §3.0.1; his approved Plan v4 frames 'Goals — populated' and
// 'Goals — empty'), BUILT TO goals v03 on 2026-10-31 (MoneyKeel/documents/plan/moneykeel_pres_mock_goals_v03.html; his DEC-9228: he
// judges the built screen on TestFlight).
//
// His words on the old Goals screen (DEC-8889, 2026-10-27): "$1,750/month typical free cash to save - typical based on what? The
// screen has no name … When I click on "Add goal" same - other tabs missing … Debt Pay-off should be a goal to enter." So:
//  - the screen is named by the Plan bar with Goals selected, and adding a goal opens HERE, under the bar — never on another screen;
//  - what can go toward goals says how it is made: take-home − expenses − debt payments, this year's 12 months averaged;
//  - paying off a debt is a goal a person enters: pick the debt, then the month; it says what a month needs and why;
//  - no Prepare items, and no debt sections: the payoff plan and what each debt costs are on Cash flow, under Debts, one tap away.
// Every figure is worked in src/domain/goals (goalsCapacity, debtGoalPlan, requiredMonthly, goalStatus); this file only prints.
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082)
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii } from '../utils/theme';
import { SectionBand } from './SectionBand';
import { MoneyBox } from './MoneyBox';   // every money box, one component (DEC-8385)
import { EmptyNote } from './UI';
import { maskedMoney, maskedMoney2 } from './useMoney';
import { useStore, type Goal } from '../store/useStore';
import { goalStatus, monthsUntil, requiredMonthly, planGoalRows, type PlanGoalRow } from '../domain/goals';
import { goalsCapacity, debtGoalPlan, monthYear, type DebtGoalPlan } from '../domain/goals/planGoals';
import { monthKey } from '../domain/income/salary-months';
import { monthYearShown } from '../domain/_shared/dates';   // the one month writer
import type { Debt } from '../domain/debt';
import { percentDigits } from '../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)

const pct2 = (r: number) => `${percentDigits(r, 2)}%`;   // a rate held 0…1, printed to two decimals (Q49)
const num = (v: string) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
const ymOf = (month: string, year: string): string | null => {
  const m = Math.round(num(month)), y = Math.round(num(year));
  return m >= 1 && m <= 12 && y >= 2000 && y <= 2200 ? `${y}-${String(m).padStart(2, '0')}` : null;
};

type Form = { id?: string; kind: 'save' | 'debt'; label: string; target: string; saved: string; month: string; year: string; debtId: string | null };
const blank = (): Form => ({ kind: 'save', label: '', target: '', saved: '', month: '', year: '', debtId: null });

/** a debt goal's line under its name, from the debt as it stands */
function debtLine(p: DebtGoalPlan): string {
  if (p.kind === 'gone') return 'this debt is no longer on Cash flow, under Debts';
  if (p.kind === 'paid') return 'paid off';
  if (p.kind === 'no-rate') return 'its rate is not entered — enter it on Cash flow, under Debts';
  if (p.kind === 'no-date') return 'no date set';
  if (p.extra <= 0) return p.clears ? `your ${maskedMoney(p.payment)}/month already clears it, in ${p.clears.when}` : 'no date set';
  return `needs ${maskedMoney2(p.need)}/month — ${maskedMoney2(p.extra)} more than the ${maskedMoney(p.payment)}/month you pay now`;
}

export function PlanGoals({ initialAdd = false }: { initialAdd?: boolean }) {
  const router = useRouter();
  const store = useStore() as any;
  const op = store.onboardingProfile ?? null;
  const debts: Debt[] = store.liabilities ?? [];
  const goals: PlanGoalRow[] = planGoalRows(store.goals);   // the one reader of what is saved (2026-10-30)
  const now = new Date();
  const nowYm = monthKey(now);
  const cap = useMemo(() => goalsCapacity(op, debts), [op, debts]);
  const [form, setForm] = useState<Form | null>(initialAdd ? blank() : null);

  // the goals still to reach: a saving goal not yet funded, and every debt goal (paid off reads so)
  const shown = goals.filter((g) => g.kind === 'debt' || (g.saved || 0) < (g.target || 0));
  const debtOf = (id?: string | null) => debts.find((d) => d.debt_id === id) ?? null;
  const open = (g: PlanGoalRow) => {
    const m = String(g.targetYm ?? '').match(/^(\d{4})-(\d{1,2})/);
    setForm({ id: g.id, kind: g.kind === 'debt' ? 'debt' : 'save', label: g.label, target: String(g.target ?? ''), saved: String(g.saved ?? ''),
      month: m ? String(Number(m[2])) : '', year: m ? m[1] : '', debtId: g.debtId ?? null });
  };

  const capacityBox = (
    <View style={s.box}>
      <SectionBand inCard inset={Spacing.lg} onRowEdges title="What you can put toward goals" value={`${maskedMoney(cap.nothing ? 0 : cap.surplus)}/month`} />
      {cap.nothing ? <EmptyNote door="income" /> : (
        <>
          <Text style={s.line}>Your planned surplus — the average of this year’s 12 months:</Text>
          <View style={s.lrow}><Text style={s.lk}>Take-home</Text><Text style={s.lv}>{maskedMoney(cap.takeHome)}/month</Text></View>
          <View style={s.lrow}><Text style={s.lk}>− Expenses (your budget)</Text><Text style={s.lv}>{maskedMoney(cap.expenses)}/month</Text></View>
          <View style={s.lrow}><Text style={s.lk}>− Debt payments</Text><Text style={s.lv}>{maskedMoney(cap.debt)}/month</Text></View>
          <View style={[s.lrow, s.ltotal]}><Text style={[s.lk, s.lkTotal]}>= Planned surplus</Text><Text style={[s.lv, s.lvTotal]}>{maskedMoney(cap.surplus)}/month</Text></View>
          <Text style={s.how}>{cap.lumpy
            ? `This year’s 12 months run from ${maskedMoney(cap.min)}/month to ${maskedMoney(cap.max)}/month.`
            : `Every month this year comes to the same ${maskedMoney(cap.surplus)}. When months differ, the lowest and highest month show here.`}</Text>
        </>
      )}
    </View>
  );

  if (form) return <View testID="plan-goals"><GoalForm form={form} setForm={setForm} debts={debts} surplus={cap.nothing ? 0 : cap.surplus} now={now}
    onCancel={() => setForm(null)}
    onSave={(g) => { if (form.id) store.updateGoal(form.id, g); else store.addGoal(g); setForm(null); }}
    onDelete={form.id ? () => { store.deleteGoal(form.id); setForm(null); } : undefined} /></View>;

  return (
    <View testID="plan-goals">
      {capacityBox}
      {shown.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.eT}>Nothing here yet</Text>
          {/* names what a goal IS, in her words — a person who has never set one does not know (v4) */}
          <Text style={s.eB}>A goal is anything you’re putting money aside for: a car, a wedding, helping a grandchild.</Text>
          <TouchableOpacity style={s.cta} onPress={() => setForm(blank())} accessibilityRole="button" accessibilityLabel="Add a goal">
            <Text style={s.ctaTxt}>+ Add a goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={s.box}>
            <SectionBand inCard inset={Spacing.lg} onRowEdges title="What you’re saving for" />
            {/* the front door: with more than one goal, "can I afford them together" IS the question (v4) */}
            <TouchableOpacity style={s.row} onPress={() => router.push('/multi-goal')} accessibilityRole="button"
              accessibilityLabel="Can I afford it all? Your goals weighed together.">
              <Text style={s.gt}>Can I afford it all?</Text><Text style={s.gs}>with more than one goal</Text><Text style={s.chev}>›</Text>
            </TouchableOpacity>
            {shown.map((g) => {
              // the goal's month through the app's one month writer (monthYearShown): '2027-10' → 'Oct 2027', as v03 draws it; a goal
              // stored with a year alone (the goals service's shape) shows that year
              const byWhen = g.targetYm ? monthYearShown(Number(g.targetYm.slice(0, 4)), Number(g.targetYm.slice(5, 7))) : g.targetDate;
              if (g.kind === 'debt') {
                const p = debtGoalPlan(debtOf(g.debtId), g.targetYm, now);
                const right = p.kind === 'gone' ? '' : p.kind === 'paid' ? 'paid off'
                  : `${maskedMoney(p.balance)}${byWhen ? ` by ${byWhen}` : ''}`;
                return (
                  <View key={g.id}>
                    <TouchableOpacity style={[s.row, s.divider]} onPress={() => open(g)} accessibilityRole="button" accessibilityLabel={`${g.label}. Opens the goal.`}>
                      <Text style={s.gt}>💳 {g.label}</Text><Text style={s.gs}>{right}</Text><Text style={s.chev}>›</Text>
                    </TouchableOpacity>
                    <Text style={s.gsub}>{debtLine(p)}</Text>
                  </View>
                );
              }
              const worked = { target: g.target, saved: g.saved, targetDate: g.targetYm ?? undefined, duration: g.duration };
              const st = goalStatus(worked, g.fundedByMonth?.[nowYm] ?? 0, now);
              const word = st === 'behind' ? ' · behind' : st === 'on_track' ? ' · on track' : '';
              const per = requiredMonthly(worked, now);
              const months = monthsUntil(g.targetYm ?? undefined, now) ?? (Number(g.duration) > 0 ? Number(g.duration) : null);
              const toGo = Math.max(0, (g.target || 0) - (g.saved || 0));
              return (
                <View key={g.id}>
                  <TouchableOpacity style={[s.row, s.divider]} onPress={() => open(g)} accessibilityRole="button" accessibilityLabel={`${g.label}. Opens the goal.`}>
                    <Text style={s.gt}>{g.icon || '🎯'} {g.label}</Text><Text style={s.gs}>{maskedMoney(g.target || 0)}{byWhen ? ` by ${byWhen}` : ''}{word}</Text><Text style={s.chev}>›</Text>
                  </TouchableOpacity>
                  <Text style={s.gsub}>{per != null && months
                    ? `${maskedMoney(g.saved || 0)} saved · needs ${maskedMoney(per)}/month: ${maskedMoney(toGo)} to go ÷ ${plural(months, 'month')}`
                    : `${maskedMoney(g.saved || 0)} saved · no date set`}</Text>
                </View>
              );
            })}
            <TouchableOpacity style={[s.row, s.divider]} onPress={() => router.push('/education')} accessibilityRole="button"
              accessibilityLabel="College planner — what a course of study costs, and what it needs a month">
              <Text style={s.gt}>College planner</Text><Text style={s.gs}>what a course of study costs, and what it needs a month</Text><Text style={s.chev}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.addRow} onPress={() => setForm(blank())} accessibilityRole="button" accessibilityLabel="Add a goal">
              <Text style={s.addTxt}>+ Add a goal</Text>
            </TouchableOpacity>
          </View>
          {/* the debt sections left Goals (v03 row of 2026-10-31): their home is Cash flow, under Debts */}
          <TouchableOpacity style={s.doorRow} onPress={() => router.push('/(tabs)/cashflow?tab=debts' as any)} accessibilityRole="button"
            accessibilityLabel="Your debts, the payoff plan and what each one costs, are on Cash flow, under Debts. Opens Cash flow.">
            <Text style={s.door}>Your debts — the payoff plan and what each one costs — are on Cash flow, under Debts ›</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

/** ADD A GOAL, under the Plan bar: save toward something, or pay off a debt (goals v03 phone 2 and its row of 2026-10-31) */
function GoalForm({ form, setForm, debts, surplus, now, onCancel, onSave, onDelete }: {
  form: Form; setForm: (f: Form) => void; debts: Debt[]; surplus: number; now: Date;
  onCancel: () => void; onSave: (g: Omit<Goal, 'id'>) => void; onDelete?: () => void;
}) {
  const set = (patch: Partial<Form>) => setForm({ ...form, ...patch });
  const ym = ymOf(form.month, form.year);
  const owed = debts.filter((d) => (Number(d.remaining_balance) || 0) > 0);
  const debt = owed.find((d) => d.debt_id === form.debtId) ?? null;
  const plan = form.kind === 'debt' && debt ? debtGoalPlan(debt, ym, now) : null;
  const save = { target: num(form.target), saved: num(form.saved), targetDate: ym ?? undefined };
  const perMonth = form.kind === 'save' && ym && save.target > 0 ? requiredMonthly(save as any, now) : null;
  const months = ym ? monthsUntil(ym, now) : null;
  const ready = form.kind === 'debt' ? !!debt && !!ym : form.label.trim().length > 0 && save.target > 0;
  const submit = () => {
    if (!ready) return;
    if (form.kind === 'debt' && debt) {
      onSave({ label: `Pay off ${debt.label}`, icon: '💳', target: Number(debt.remaining_balance) || 0, saved: 0, color: Colors.primary,
        targetDate: ym ?? undefined, duration: months ? String(months) : undefined, kind: 'debt', debtId: debt.debt_id });
    } else {
      onSave({ label: form.label.trim(), icon: '🎯', target: save.target, saved: save.saved, color: Colors.primary,
        targetDate: ym ?? undefined, duration: months ? String(months) : undefined, kind: 'save' });
    }
  };
  const dateBoxes = (
    <View style={s.dateRow}>
      <TextInput style={s.in} keyboardType="number-pad" value={form.month} onChangeText={(t) => set({ month: t })} placeholder="Month (MM)"
        placeholderTextColor={Colors.textTertiary} accessibilityLabel="Month, 1 to 12" maxLength={2} />
      <TextInput style={s.in} keyboardType="number-pad" value={form.year} onChangeText={(t) => set({ year: t })} placeholder="Year (YYYY)"
        placeholderTextColor={Colors.textTertiary} accessibilityLabel="Year" maxLength={4} />
    </View>
  );
  return (
    <View style={s.box}>
      <SectionBand inCard inset={Spacing.lg} onRowEdges title={form.id ? 'Edit a goal' : 'Add a goal'} />
      <Text style={s.dL}>What is it for?</Text>
      <View style={s.segRow}>
        {(['save', 'debt'] as const).map((k) => (
          <TouchableOpacity key={k} style={[s.seg, form.kind === k && s.segOn]} onPress={() => set({ kind: k })} accessibilityRole="radio"
            accessibilityState={{ selected: form.kind === k }}>
            <Text style={[s.segT, form.kind === k && s.segTOn]}>{k === 'save' ? 'Save toward something' : 'Pay off a debt'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {form.kind === 'debt' ? (
        <>
          <View style={s.bleed}><SectionBand light title="Which debt" /></View>
          {owed.length === 0 && <EmptyNote door="debts" />}
          {owed.map((d) => {
            const on = d.debt_id === form.debtId;
            return (
              <TouchableOpacity key={d.debt_id} style={[s.pick, on && s.pickOn]} onPress={() => set({ debtId: d.debt_id })} accessibilityRole="radio"
                accessibilityState={{ selected: on }} accessibilityLabel={`${d.label}`}>
                <Text style={s.pickMark}>{on ? '◉' : '○'}</Text><Text style={s.pickT}>{d.label}</Text>
                <Text style={s.pickR}>{maskedMoney(Number(d.remaining_balance) || 0)}{d.interest_rate_apr != null ? ` at ${pct2(Number(d.interest_rate_apr))}` : ' · rate not entered'}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={s.bleed}><SectionBand light title="Paid off by" /></View>
          {dateBoxes}
          {plan && plan.kind === 'no-rate' && <Text style={s.how}>Its rate is not entered — enter it on Cash flow, under Debts.</Text>}
          {plan && plan.kind === 'plan' && (plan.extra <= 0 ? (
            <View style={s.result}><Text style={s.rBig}>{plan.clears ? `Your ${maskedMoney(plan.payment)}/month already clears it, in ${plan.clears.when}.` : 'Your payment already clears it by then.'}</Text></View>
          ) : (
            <>
              <View style={s.result}>
                <Text style={s.rBig}>Needs {maskedMoney2(plan.need)}/month</Text>
                <Text style={s.rSub}>to clear {maskedMoney(plan.balance)} by {plan.lastMonth} — {maskedMoney2(plan.extra)} more than the {maskedMoney(plan.payment)}/month you pay now.</Text>
              </View>
              <Text style={s.how}>How: {maskedMoney(plan.balance)} at {pct2(plan.rate)}/year is {pct2(plan.monthlyRate)}/month. {plan.months} equal payments, {plan.firstMonth} to {plan.lastMonth}, clear it: {maskedMoney2(plan.need)}/month, {maskedMoney(plan.interest)} of interest.{plan.clears && plan.saved != null
                ? ` At ${maskedMoney(plan.payment)}/month it clears in ${plan.clears.when}, with ${maskedMoney(plan.clears.interest)} of interest — paying it by ${plan.lastMonth} saves about ${maskedMoney(plan.saved)}.`
                : ` At ${maskedMoney(plan.payment)}/month it does not clear.`}</Text>
              <Text style={s.how}>{plan.extra <= surplus
                ? `It fits in what you can put toward goals: ${maskedMoney2(plan.extra)} of your ${maskedMoney(surplus)}/month.`
                : `It needs ${maskedMoney2(plan.extra - surplus)}/month more than you can put toward goals (${maskedMoney(surplus)}/month).`}</Text>
            </>
          ))}
        </>
      ) : (
        <>
          <View style={s.bleed}><SectionBand light title="What it is for" /></View>
          <TextInput style={s.in1} value={form.label} onChangeText={(t) => set({ label: t })} placeholder="e.g. a car, a wedding"
            placeholderTextColor={Colors.textTertiary} accessibilityLabel="What the goal is for" />
          <View style={s.bleed}><SectionBand light title="How much" /></View>
          <Text style={s.fieldL}>Target amount</Text>
          <MoneyBox bare style={s.in1} value={form.target} onChangeText={(t: string) => set({ target: t })} a11y="Target amount" />
          <Text style={s.fieldL}>Saved so far</Text>
          <MoneyBox bare style={s.in1} value={form.saved} onChangeText={(t: string) => set({ saved: t })} a11y="Saved so far" />
          <View style={s.bleed}><SectionBand light title="By when" /></View>
          {dateBoxes}
          {perMonth != null && months != null && ym && (
            <View style={s.result}>
              <Text style={s.rBig}>Needs {maskedMoney(perMonth)}/month</Text>
              <Text style={s.rSub}>{maskedMoney(Math.max(0, save.target - save.saved))} to go ÷ {plural(months, 'month')}, by {monthYear(ym)}.</Text>
            </View>
          )}
        </>
      )}
      <TouchableOpacity style={[s.btn, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={submit} accessibilityRole="button"
        accessibilityLabel={form.id ? 'Save the goal' : 'Add this goal'}>
        <Text style={s.btnT}>{form.id ? 'Save' : 'Add this goal'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.linkRow} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel"><Text style={s.link}>Cancel</Text></TouchableOpacity>
      {onDelete && (
        <TouchableOpacity style={s.linkRow} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete goal"><Text style={[s.link, { color: Colors.red }]}>Delete goal</Text></TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // A BOX RUNS EDGE TO EDGE OF THE PHONE, square corners, so its dark bar runs end to end across the screen (DEC-8839, DEC-8890):
  // the page's margins taken back; the bar bleeds by the box's own padding
  box: { backgroundColor: Colors.white, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm, marginBottom: Spacing.md },
  bleed: { marginHorizontal: -Spacing.lg, marginTop: 10 },   // a light bar inside the box, across it
  line: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  lrow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  ltotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 2 },
  lk: { fontSize: 15, color: Colors.textSecondary },
  lkTotal: { color: Colors.textPrimary, fontWeight: '800' },
  lv: { fontSize: 15, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  lvTotal: { fontWeight: '800' },
  how: { fontSize: 13, color: Colors.textTertiary, marginTop: 8, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingVertical: 11 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  gt: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  gs: { fontSize: 13, color: Colors.textSecondary, maxWidth: 170, textAlign: 'right' },
  chev: { fontSize: 15, color: Colors.textTertiary },
  gsub: { fontSize: 13, color: Colors.textSecondary, marginTop: -6, marginBottom: 8, lineHeight: 17 },
  addRow: { minHeight: 44, justifyContent: 'center' },
  addTxt: { fontSize: 15, fontWeight: '700', color: Colors.primaryDeep },
  doorRow: { minHeight: 44, justifyContent: 'center', paddingVertical: 12 },
  door: { fontSize: 13, fontWeight: '700', color: Colors.primary, lineHeight: 20 },
  empty: { backgroundColor: Colors.white, marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md },
  eT: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginBottom: 6 },
  eB: { fontSize: 13, lineHeight: 20, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.md },
  // square, as v4 draws it
  cta: { backgroundColor: Colors.primaryDeep, minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  dL: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginTop: 10 },
  segRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  seg: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  segT: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary, textAlign: 'center' },
  segTOn: { color: Colors.primaryDark },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingHorizontal: 12, marginTop: 8 },
  pickOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pickMark: { fontSize: 15, color: Colors.textPrimary },
  pickT: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pickR: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },   // as goals v03 draws the debt rows (CF4-05, 2026-11-01)
  dateRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  in: { flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary },
  in1: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary, marginTop: 6 },
  fieldL: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginTop: 10 },
  result: { backgroundColor: Colors.primaryLight, borderRadius: Radii.md, padding: 12, marginTop: 12 },
  rBig: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  rSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  btn: { backgroundColor: Colors.primary, borderRadius: Radii.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnT: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  linkRow: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  link: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
});
