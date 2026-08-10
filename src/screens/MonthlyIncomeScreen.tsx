// Your monthly income (Social Security · pension · annuity · other) — the retired lens's front
// door (approved detailed design v1.1; the user-lens walkthrough's worst finding was that this
// screen didn't exist). Two numbers a retiree knows by heart, ~20 seconds, no bank login.
// Writes the ri_* fields the F5 paycheck engine reads — LOCKED guaranteed set: ss / pension /
// annuities / other (withdrawals & required minimums live elsewhere; the safe draw replaces them).
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SectionBand } from '../components/SectionBand';
import { useRouter } from 'expo-router';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
type Rhythm = 'monthly' | 'quarterly' | 'annual';
const DIV: Record<Rhythm, number> = { monthly: 1, quarterly: 3, annual: 12 };

export default function MonthlyIncomeScreen() {
  const store = useStore() as any;
  const router = useRouter();
  const op = store.onboardingProfile ?? {};

  // raw text in state, parse on save (L-9: never round-trip a keystroke through a parser)
  const [ssReceiving, setSsReceiving] = useState<boolean>(num(op.ri_ss) > 0 || op.ri_ss_receiving !== 'no');
  const [ss, setSs] = useState(String(op.ri_ss ?? ''));
  const [ssDay, setSsDay] = useState(String(op.ri_ss_day ?? ''));
  const [pension, setPension] = useState(String(op.ri_pension ?? ''));
  const [pensionFreq, setPensionFreq] = useState<Rhythm>((op.ri_pension_freq as Rhythm) ?? 'monthly');
  const [pensionMonth, setPensionMonth] = useState<number>(num(op.ri_pension_month) || new Date().getMonth() + 1);
  const [annuity, setAnnuity] = useState(String(op.ri_annuities ?? ''));
  const [annuityFreq, setAnnuityFreq] = useState<Rhythm>((op.ri_annuities_freq as Rhythm) ?? 'monthly');
  const [annuityMonth, setAnnuityMonth] = useState<number>(num(op.ri_annuities_month) || new Date().getMonth() + 1);
  const [other, setOther] = useState(String(op.ri_other ?? ''));

  // running total (display only): the monthly equivalent of the guaranteed set — instant payoff
  const guaranteedMonthly = useMemo(() => {
    const ssM = ssReceiving ? num(ss) : 0;
    return ssM + num(pension) / DIV[pensionFreq] + num(annuity) / DIV[annuityFreq] + num(other);
  }, [ssReceiving, ss, pension, pensionFreq, annuity, annuityFreq, other]);

  const save = () => {
    const patch: Record<string, any> = {
      ...op,
      ri_ss: ssReceiving ? String(num(ss) || '') : '',
      ri_ss_freq: 'monthly',
      ri_ss_day: num(ssDay) >= 1 && num(ssDay) <= 31 ? Math.round(num(ssDay)) : undefined,
      ri_ss_receiving: ssReceiving ? 'yes' : 'no',
      ri_pension: String(num(pension) || ''),
      ri_pension_freq: pensionFreq,
      ri_pension_month: pensionFreq === 'monthly' ? undefined : pensionMonth,
      ri_annuities: String(num(annuity) || ''),
      ri_annuities_freq: annuityFreq,
      ri_annuities_month: annuityFreq === 'monthly' ? undefined : annuityMonth,
      ri_other: String(num(other) || ''),
      ri_other_freq: 'monthly',
    };
    // the received-now gate reads incomeSources — saving an amount here MUST open that gate,
    // or the paycheck engine would see nothing (the B-31 lesson, enforced by test)
    if (guaranteedMonthly > 0) {
      const srcs: string[] = Array.isArray(op.incomeSources) ? op.incomeSources : [];
      if (!srcs.includes('retirement_income')) patch.incomeSources = [...srcs, 'retirement_income'];
    }
    store.setOnboardingProfile(patch);
    router.back();
  };

  const rhythmChips = (freq: Rhythm, setFreq: (r: Rhythm) => void, month: number, setMonth: (m: number) => void, label: string) => (
    <>
      <View style={styles.chips}>
        {(['monthly', 'quarterly', 'annual'] as Rhythm[]).map((r) => (
          <TouchableOpacity key={r} accessibilityRole="radio" accessibilityState={{ selected: freq === r }}
            accessibilityLabel={`${label} paid ${r}`}
            style={[styles.chip, freq === r && styles.chipOn]} onPress={() => setFreq(r)}>
            <Text style={[styles.chipT, freq === r && styles.chipTOn]}>{r === 'monthly' ? 'Monthly' : r === 'quarterly' ? 'Quarterly' : 'Once a year'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {freq !== 'monthly' && (
        <View style={styles.chips}>
          {MONTH_NAMES.map((m, i) => (
            <TouchableOpacity key={m} accessibilityRole="radio" accessibilityState={{ selected: month === i + 1 }}
              accessibilityLabel={`lands in ${m}`}
              style={[styles.mChip, month === i + 1 && styles.chipOn]} onPress={() => setMonth(i + 1)}>
              <Text style={[styles.mChipT, month === i + 1 && styles.chipTOn]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  return (
    <KeyboardAwareScreen>
      <Text style={styles.h1}>Your monthly income</Text>
      <Text style={styles.sub}>The money that arrives no matter what markets do. This builds your paycheck — no bank login needed.</Text>

      <View style={styles.card}>
        <SectionBand title="Social Security" />
        <View style={styles.row}>
          <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: ssReceiving }}
            style={[styles.chip, ssReceiving && styles.chipOn]} onPress={() => setSsReceiving(true)}>
            <Text style={[styles.chipT, ssReceiving && styles.chipTOn]}>I receive it</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected: !ssReceiving }}
            style={[styles.chip, !ssReceiving && styles.chipOn]} onPress={() => setSsReceiving(false)}>
            <Text style={[styles.chipT, !ssReceiving && styles.chipTOn]}>Not yet</Text>
          </TouchableOpacity>
        </View>
        {ssReceiving ? (
          <>
            <Text style={styles.label}>Each month</Text>
            <TextInput style={styles.input} keyboardType="decimal-pad" value={ss} onChangeText={setSs}
              placeholder="2,600" accessibilityLabel="Social Security amount each month" />
            <Text style={styles.label}>Arrives on day (optional)</Text>
            <TextInput style={styles.inputSm} keyboardType="number-pad" value={ssDay} onChangeText={setSsDay}
              placeholder="3" accessibilityLabel="day of month Social Security arrives" />
          </>
        ) : (
          <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/retirement')}>
            <Text style={styles.link}>Deciding when to claim? Compare 62 / 67 / 70 in Plan →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        <SectionBand title="Pension" />
        <Text style={styles.label}>Amount {pensionFreq === 'monthly' ? 'each month' : pensionFreq === 'quarterly' ? 'each quarter' : 'each year'}</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={pension} onChangeText={setPension}
          placeholder="1,600" accessibilityLabel="pension amount" />
        {rhythmChips(pensionFreq, setPensionFreq, pensionMonth, setPensionMonth, 'pension')}
      </View>

      <View style={styles.card}>
        <SectionBand title="Annuity" />
        <TextInput style={styles.input} keyboardType="decimal-pad" value={annuity} onChangeText={setAnnuity}
          placeholder="0" accessibilityLabel="annuity amount" />
        {rhythmChips(annuityFreq, setAnnuityFreq, annuityMonth, setAnnuityMonth, 'annuity')}
      </View>

      <View style={styles.card}>
        <SectionBand title="Other steady income" />
        <Text style={styles.label}>Each month (rental, part-time, anything regular)</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={other} onChangeText={setOther}
          placeholder="0" accessibilityLabel="other steady income each month" />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Your guaranteed income</Text>
        <Text style={styles.totalV} accessibilityLabel={`guaranteed income ${money(guaranteedMonthly)} a month`}>
          {money(guaranteedMonthly)} <Text style={styles.totalUnit}>a month</Text>
        </Text>
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={save} accessibilityRole="button" accessibilityLabel="Save monthly income">
        <Text style={styles.saveT}>Save</Text>
      </TouchableOpacity>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  sub: { fontSize: 15, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: Spacing.sm },
  section: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.xs },
  label: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 17, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary },
  inputSm: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radii.md, padding: 10, fontSize: 17, color: Colors.textPrimary, backgroundColor: Colors.bgSecondary, width: 90 },
  row: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.xs },
  chip: { paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSecondary, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipT: { fontSize: 15, color: Colors.textSecondary },
  chipTOn: { color: Colors.primaryDark, fontWeight: '600' },
  mChip: { paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgSecondary, minHeight: 44, justifyContent: 'center' },
  mChipT: { fontSize: 15, color: Colors.textSecondary },
  link: { color: Colors.primary, fontSize: 15, fontWeight: '600', marginTop: Spacing.xs },
  totalCard: { backgroundColor: Colors.primaryLight, borderRadius: Radii.lg, padding: Spacing.md, marginTop: Spacing.xs, marginBottom: Spacing.md },
  totalLabel: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600' },
  totalV: { fontSize: 30, fontWeight: '700', color: Colors.primaryDark },
  totalUnit: { fontSize: 15, fontWeight: '500' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, padding: 16, alignItems: 'center', marginBottom: Spacing.xl },
  saveT: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
