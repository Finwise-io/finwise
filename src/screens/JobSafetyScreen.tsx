// Your safety net — REBUILT 2026-07-17 to the founder-approved mock (design audit: this screen
// predated the FCC design language). Calm word cards (no smiley radios), the funding gap as the
// single 34pt hero with its math spelled out in one sentence, honest inputs (no silent $2,500
// default — the screen ASKS when nothing is logged), and a real action (save the gap as a goal)
// instead of chatty alerts. Answers persist on tap; there is no Save button to forget.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore, useMonthlyStats } from '../store/useStore';
import { Disclaimer } from '../components/Disclaimer';
import { money } from '../domain/_shared/num';
import { Colors, Spacing, Radii } from '../utils/theme';

type RiskLevel = 'low' | 'medium' | 'high';

const RISK_OPTIONS: { level: RiskLevel; label: string; sub: string }[] = [
  { level: 'low', label: 'Very stable', sub: 'secure for the next year' },
  { level: 'medium', label: 'Some uncertainty', sub: 'could change this year' },
  { level: 'high', label: 'Worried', sub: 'income could stop within a year' },
];
const MONTH_CHOICES = [3, 6, 9, 12];
const EXAMPLE_PACE = 300;   // $/mo — always LABELED as an example, never presented as advice

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function JobSafetyScreen() {
  const { jobRiskLevel, emergencyMonths, setJobRisk, setEmergencyMonths, savings, investments, goals, addGoal } = useStore() as any;
  const { monthSpend } = useMonthlyStats() as any;

  const [selected, setSelected] = useState<RiskLevel | null>(jobRiskLevel ?? null);
  const [months, setMonths] = useState<number>(MONTH_CHOICES.includes(emergencyMonths) ? emergencyMonths : 6);
  const [basis, setBasis] = useState<'savings' | 'all'>('savings');
  const [customExpenses, setCustomExpenses] = useState('');

  const totalSavings = (savings ?? []).reduce((s: number, e: any) => s + e.amount, 0);
  const totalInvestments = (investments ?? []).reduce((s: number, e: any) => s + e.amount, 0);
  // Honest baseline: what the user typed, else what their logs show — never a silent default.
  const ess = num(customExpenses) || monthSpend || 0;
  const available = basis === 'savings' ? totalSavings : totalSavings + totalInvestments;
  const target = ess * months;
  const gap = Math.max(0, target - available);
  const covered = ess > 0 && gap <= 0;
  const monthsToClose = gap > 0 ? Math.ceil(gap / EXAMPLE_PACE) : 0;
  const basisWord = basis === 'savings' ? 'savings' : 'savings and investments';

  const pick = (level: RiskLevel) => { setSelected(level); setJobRisk?.(level); };          // persists on tap
  const pickMonths = (m: number) => { setMonths(m); setEmergencyMonths?.(m); };

  const saveAsGoal = () => {
    const exists = (goals ?? []).some((g: any) => /emergency/i.test(String(g.label)));
    if (exists) { Alert.alert('Already tracking it', 'Your Emergency fund goal is on the Goals screen.'); return; }
    addGoal?.({ label: 'Emergency fund', icon: '🛟', target: Math.round(target), saved: Math.round(Math.min(available, target)), duration: String(Math.max(monthsToClose, 1)), color: Colors.primary });
    Alert.alert('Saved as a goal', 'Track it on the Goals screen — fund it from any month’s surplus.');
  };

  return (
    <KeyboardAwareScreen style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Your safety net</Text>
      <Text style={s.sub}>If your income stopped, how long would your cash carry you?</Text>

      {/* 1 · the stability question — calm word cards, selection = ✓ + weight, saved on tap */}
      <View style={s.card}>
        <SectionBand title="HOW STEADY IS YOUR INCOME?" />
        <View style={{ gap: 8, marginTop: 8 }}>
          {RISK_OPTIONS.map((opt) => {
            const on = selected === opt.level;
            return (
              <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: on }} key={opt.level}
                accessibilityLabel={`${opt.label} — ${opt.sub}`} style={[s.option, on && s.optionOn]} onPress={() => pick(opt.level)}>
                <Text style={[s.optionTxt, on && s.optionTxtOn]}>{on ? '✓ ' : ''}{opt.label}</Text>
                <Text style={s.optionSub}>{opt.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2 · the cushion — the gap IS the hero; the math is one readable sentence */}
      <View style={s.card}>
        <SectionBand title={covered ? 'YOUR CUSHION' : 'STILL NEEDED FOR YOUR CUSHION'} />

        {ess <= 0 ? (
          <>
            <Text style={s.askLine}>What do your essential bills come to in a typical month? (rent, food, utilities — the must-pays)</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="$2,800" placeholderTextColor={Colors.textTertiary}
              value={customExpenses} onChangeText={setCustomExpenses} accessibilityLabel="Essential monthly bills" />
          </>
        ) : (
          <>
            <Text style={[s.hero, { color: covered ? Colors.gainText : Colors.amber }]}>{covered ? '✓ Covered' : money(gap)}</Text>
            <Text style={s.heroLine}>
              {months} months of essentials is {money(target)} ({money(ess)}/mo) — your {basisWord} cover {money(Math.min(available, target))} of it.
            </Text>
            {monthSpend > 0 && !customExpenses && (
              <Text style={s.baselineNote}>Using {money(monthSpend)}/mo from your logged spending — type your own if a typical month differs.</Text>
            )}
            {monthSpend > 0 && (
              <TextInput style={[s.input, { marginTop: 8 }]} keyboardType="decimal-pad" placeholder={`${Math.round(monthSpend)}`}
                placeholderTextColor={Colors.textTertiary} value={customExpenses} onChangeText={setCustomExpenses}
                accessibilityLabel="Essential monthly bills, editable" />
            )}
          </>
        )}

        <View style={s.chipRow}>
          {MONTH_CHOICES.map((m) => {
            const on = months === m;
            return (
              <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: on }} key={m}
                accessibilityLabel={`${m} months of cushion`} style={[s.chip, on && s.chipOn]} onPress={() => pickMonths(m)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{on ? '✓ ' : ''}{m} mo</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.chipRow}>
          {([['savings', 'Savings only'], ['all', 'Savings + investments']] as const).map(([b, label]) => {
            const on = basis === b;
            return (
              <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: on }} key={b}
                accessibilityLabel={`Count ${label}`} style={[s.chip, on && s.chipOn]} onPress={() => setBasis(b)}>
                <Text style={[s.chipTxt, on && s.chipTxtOn]}>{on ? '✓ ' : ''}{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {basis === 'all' && (
          <Text style={s.penaltyNote}>Early 401(k)/IRA withdrawals usually cost a 10% penalty plus income tax — counted here, but harder to reach in a pinch.</Text>
        )}
      </View>

      {/* 3 · what would close it — a labeled example pace + a real action */}
      {gap > 0 && ess > 0 && (
        <View style={s.card}>
          <SectionBand title="WHAT WOULD CLOSE IT" />
          <Text style={s.closeLine}>
            Setting aside <Text style={s.bold}>{money(EXAMPLE_PACE)}/mo</Text> closes the gap in <Text style={s.bold}>{monthsToClose} months</Text> — an example pace, set your own.
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save the cushion as a goal" style={s.goalLink} onPress={saveAsGoal}>
            <Text style={s.goalLinkT}>Save it as a goal ›</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.foot}>Estimates from your logged spending — not advice.</Text>
      <Disclaimer />
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 8 },
  kicker: { fontSize: 11, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.7 },
  option: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, backgroundColor: Colors.cardBg },
  optionOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionTxt: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optionTxtOn: { fontWeight: '800', color: Colors.primaryDark },
  optionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  hero: { fontSize: 38, fontWeight: '800', marginTop: 2, fontVariant: ['tabular-nums'] },
  heroLine: { fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18, fontVariant: ['tabular-nums'] },
  baselineNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  askLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 6, lineHeight: 21 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary, marginTop: 8, minHeight: 48, backgroundColor: Colors.cardBg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  chipTxtOn: { fontWeight: '800', color: Colors.primaryDark },
  penaltyNote: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
  closeLine: { fontSize: 15, color: Colors.textPrimary, marginTop: 4, lineHeight: 21, fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '800' },
  goalLink: { minHeight: 44, justifyContent: 'center', marginTop: 2 },
  goalLinkT: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  foot: { fontSize: 11, color: Colors.textTertiary, marginTop: 6 },
});
