// Your emergency fund — REBUILT 2026-07-17 to the founder-approved mock (design audit: this screen
// predated the FCC design language). Calm word cards (no smiley radios), the funding gap as the
// single 34pt hero with its math spelled out in one sentence, honest inputs (no silent $2,500
// default — the screen ASKS when nothing is logged), and a real action (save the gap as a goal)
// instead of chatty alerts. Answers persist on tap; there is no Save button to forget.
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
// ONE DOOR (MK-NW-O-004 theEmergencyFund, Q-NW-5 ruled 2026-09-27: "Yes.").
import { theEmergencyFund } from '../../MoneyKeel/functions/networth-and-performance/emergency-fund';
import { theNetWorth } from '../../MoneyKeel/functions/networth-and-performance/net-worth';   // Investments, the Net worth figure (MK-XS-M-003)
import { useNetWorthInputs } from '../hooks/useNetWorthInputs';   // the Net worth family's inputs, built once (MK-NW-F-145, DEC-0345)
import { Disclaimer } from '../components/Disclaimer';
import { money } from '../domain/_shared/num';
import { figPer } from '../components/figure';
import { Colors, Spacing, Radii } from '../utils/theme';

type RiskLevel = 'low' | 'medium' | 'high';

const RISK_OPTIONS: { level: RiskLevel; label: string; sub: string }[] = [
  { level: 'low', label: 'Very stable', sub: 'secure for the next year' },
  { level: 'medium', label: 'Some uncertainty', sub: 'could change this year' },
  { level: 'high', label: 'Worried', sub: 'income could stop within a year' },
];
const MONTH_CHOICES = [3, 6, 9, 12];
const EXAMPLE_PACE = 300;   // $/month — always LABELED as an example, never presented as advice

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };

export default function JobSafetyScreen() {
  const { jobRiskLevel, emergencyMonths, setJobRisk, setEmergencyMonths, goals, addGoal } = useStore() as any;
  // G21 / Q21 / Q47 (2026-09-08): the logged baseline is the average over the months logged (MK-CF-F-189),
  // not this month's spend alone; the label says how many months it stands on.
  // THE DEFECT THIS CLOSES (measured 2026-09-27). This screen read the LOGGED average only, while the
  // emergency fund on Net worth and Stress test read his ONE essentials figure — the logged average
  // with the typed plan as the fallback (his ruling G21, 2026-09-08). For anyone who had logged
  // nothing but typed a monthly spend, this screen showed essentials of $0, so the target it set for
  // their emergency fund was $0 and the gap was $0: it told them they needed nothing. The other two
  // screens showed $4,000 for the same person on the same day.
  const router = useRouter();
  // THE NET WORTH FAMILY'S INPUTS, BUILT ONCE (owner, DEC-0345): MK-NW-F-145 netWorthInputs — the screen no longer picks them out itself
  const nwIn = useNetWorthInputs();
  const emergencyFund = theEmergencyFund(nwIn);
  const monthSpend = emergencyFund.essentialsMonthly;

  const [selected, setSelected] = useState<RiskLevel | null>(jobRiskLevel ?? null);
  const [months, setMonths] = useState<number>(MONTH_CHOICES.includes(emergencyMonths) ? emergencyMonths : 6);
  const [basis, setBasis] = useState<'savings' | 'all'>('savings');
  const [customExpenses, setCustomExpenses] = useState('');

  // WHAT THE SAVINGS ARE (2026-10-21, MK-NW-M-013): the cash the emergency fund counts on Net worth and Stress test — the
  // same door's figure — and, with investments, Net worth's own Investments line. This screen added up an old savings log
  // nobody fills any more, so a person with $18,000 in checking read "your savings cover $0" and "$20,820 still needed"
  // here while Net worth read 5.2 months on the same $18,000.
  const totalSavings = emergencyFund.cash;
  const totalInvestments = useMemo(() => theNetWorth(nwIn).investments, [nwIn]);
  // Honest baseline: what the user typed, else what their logs show — never a silent default.
  const ess = num(customExpenses) || monthSpend || 0;
  const available = basis === 'savings' ? totalSavings : totalSavings + totalInvestments;
  // THE TARGET IS THE FUNCTION'S (MK-NW-O-004), asked about the figure this person typed when they
  // typed one. It counts the rent from a property that keeps arriving (founder, 2026-10-04: "add it
  // to the cash as losing job does not mean loosing rental income too") — this screen multiplied the
  // month out for itself, so the ruling would have reached Net worth and Stress test and not here.
  const asked = num(customExpenses) > 0 ? theEmergencyFund({ ...nwIn, essentialsOverride: num(customExpenses) }) : emergencyFund;   // the month the person typed
  const rent = asked.rentalIncomeMonthly;
  const target = asked.targetFor(months)?.target ?? 0;
  const gap = Math.max(0, target - available);
  const covered = ess > 0 && gap <= 0;
  const monthsToClose = gap > 0 ? Math.ceil(gap / EXAMPLE_PACE) : 0;
  const basisWord = basis === 'savings' ? 'savings' : 'savings and investments';

  const pick = (level: RiskLevel) => { setSelected(level); setJobRisk?.(level); };          // persists on tap
  const pickMonths = (m: number) => { setMonths(m); setEmergencyMonths?.(m); };

  const saveAsGoal = () => {
    const exists = (goals ?? []).some((g: any) => /emergency/i.test(String(g.label)));
    if (exists) { Alert.alert('Already tracking it', 'Your Emergency fund goal is on the Goals screen.'); return; }
    // saved exactly as calculated (DEC-0403); both were rounded to the dollar when saved until 2026-10-20
    addGoal?.({ label: 'Emergency fund', icon: '🛟', target, saved: Math.min(available, target), duration: String(Math.max(monthsToClose, 1)), color: Colors.primary });
    Alert.alert('Saved as a goal', 'Track it on the Goals screen — fund it from any month’s surplus.');
  };

  return (
    <KeyboardAwareScreen style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>Your emergency fund</Text>
      <Text style={s.sub}>If your income stopped, how long would your cash carry you?</Text>

      {/* 1 · the stability question — calm word cards, selection = ✓ + weight, saved on tap */}
      <View style={s.card}>
        <SectionBand inCard title="HOW STEADY IS YOUR INCOME?" />
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

      {/* 2 · the emergency fund — the gap IS the hero; the math is one readable sentence */}
      <View style={s.card}>
        <SectionBand inCard title={covered ? 'YOUR EMERGENCY FUND' : 'STILL NEEDED FOR YOUR EMERGENCY FUND'} />

        {ess <= 0 ? (
          <>
            <Text style={s.askLine}>What do your essential expenses come to in a typical month? (rent, food, utilities — the must-pays)</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" placeholder="$2,800" placeholderTextColor={Colors.textTertiary}
              value={customExpenses} onChangeText={setCustomExpenses} accessibilityLabel="Essential monthly expenses" />
          </>
        ) : (
          <>
            <Text style={[s.hero, { color: covered ? Colors.gainText : Colors.amber }]}>{covered ? '✓ Covered' : money(gap)}</Text>
            <Text style={s.heroLine}>
              {months} months of essentials is {money(target)} ({money(ess)}/month{rent > 0 ? ` − ${figPer('MK-NW-M-064', rent)} rent from your property, which keeps arriving` : ''}) — your {basisWord} cover {money(Math.min(available, target))} of it.
            </Text>
            {/* RENT NOT KNOWN (DEC-3836, 2026-10-10 — the DEC-3769 line, carried from Net worth): a property's rent
                is blank or not a plain number, so the months of essentials above are costed without it. The same
                words as Net worth, with this screen's own months figure (the months chosen, MK-MN-M-020), and the
                words open the rent editor on Income. */}
            {asked.rentNotKnown && (
              <TouchableOpacity accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => router.push('/income-manager?open=rental' as any)}
                accessibilityLabel={`${months} months, rent not included. Enter rent to include. Opens Income.`}>
                <Text style={s.heroLine}>{months} months, rent not included. <Text style={{ color: Colors.primary, fontWeight: '700' }}>Enter rent to include.</Text></Text>
              </TouchableOpacity>
            )}
            {monthSpend > 0 && !customExpenses && (
              <Text style={s.baselineNote}>Using {money(monthSpend)}/month — {emergencyFund.essentialsBasis} of your logged expenses — type your own if a typical month differs.</Text>
            )}
            {monthSpend > 0 && (
              <TextInput style={[s.input, { marginTop: 8 }]} keyboardType="decimal-pad" placeholder={`${Math.round(monthSpend)}`}
                placeholderTextColor={Colors.textTertiary} value={customExpenses} onChangeText={setCustomExpenses}
                accessibilityLabel="Essential monthly expenses, editable" />
            )}
          </>
        )}

        <View style={s.chipRow}>
          {MONTH_CHOICES.map((m) => {
            const on = months === m;
            return (
              <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: on }} key={m}
                accessibilityLabel={`${m} months of emergency fund`} style={[s.chip, on && s.chipOn]} onPress={() => pickMonths(m)}>
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
          <SectionBand inCard title="WHAT WOULD CLOSE IT" />
          <Text style={s.closeLine}>
            Setting aside <Text style={s.bold}>{money(EXAMPLE_PACE)}/month</Text> closes the gap in <Text style={s.bold}>{monthsToClose} months</Text> — an example pace, set your own.
          </Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save the emergency fund as a goal" style={s.goalLink} onPress={saveAsGoal}>
            <Text style={s.goalLinkT}>Save it as a goal ›</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={s.foot}>Estimates from your logged expenses — not advice.</Text>
      <Disclaimer />
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg },
  h1: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
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
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  chip: { paddingHorizontal: 16, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, minHeight: 44, justifyContent: 'center' },
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
