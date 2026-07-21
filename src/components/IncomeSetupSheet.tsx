// The income pop-up — FINAL mock approved 2026-07-19 (mockups/final/income-popup-FINAL…).
// ONE question forks the flow: steady → one take-home amount → the CANONICAL plan fields
// (baseSalary + salaryMode 'takehome' + salaryFreq 'monthly'); varies → a typical month + a
// tap-to-adjust 12-month grid → the CANONICAL salaryByMonth table (the same one Cash flow's
// month cells, Plan and the tax organizer already read). No duplicate fields, ever.
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Radii, Spacing } from '../utils/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const num = (v: string) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

export function IncomeSetupSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const [mode, setMode] = useState<'steady' | 'varies'>(Array.isArray(op.salaryByMonth) && op.salaryByMonth.length ? 'varies' : 'steady');
  const [amount, setAmount] = useState<string>(op.baseSalary ? String(op.baseSalary) : '');
  const [months, setMonths] = useState<string[]>(() =>
    Array.isArray(op.salaryByMonth) && op.salaryByMonth.length === 12
      ? op.salaryByMonth.map((v: any) => String(v ?? ''))
      : Array(12).fill(''));
  const [editMonth, setEditMonth] = useState<number | null>(null);
  // BUILD-44 FIX (founder, 2026-07-19): months carried no YEAR and only a rolling frame was
  // implied. The table is CALENDAR-indexed (Jan→Dec, a pattern that repeats each year) — so the
  // person picks their entry FRAME: this calendar year, or the next 12 months from today. Both
  // write the SAME canonical slots; only the order and the year labels change.
  const [frame, setFrame] = useState<'calendar' | 'rolling'>('calendar');
  const nowD = new Date();
  const thisYear = nowD.getFullYear();
  const startMonth = nowD.getMonth();
  const yr2 = (y: number) => `’${String(y).slice(2)}`;
  // the grid's display order: calendar = slots 0..11 this year; rolling = current month forward
  const order: { slot: number; label: string; long: string }[] = frame === 'calendar'
    ? MONTHS.map((m, i) => ({ slot: i, label: `${m.toUpperCase()} ${yr2(thisYear)}`, long: `${m} ${thisYear}` }))
    : Array.from({ length: 12 }, (_, k) => {
        const slot = (startMonth + k) % 12;
        const y = thisYear + (startMonth + k >= 12 ? 1 : 0);
        return { slot, label: `${MONTHS[slot].toUpperCase()} ${yr2(y)}`, long: `${MONTHS[slot]} ${y}` };
      });

  const applyTypical = (v: string) => {
    setAmount(v);
    if (mode === 'varies') setMonths((m) => m.map((x, i) => (x === '' || x === amount ? v : x)));
  };

  const save = () => {
    if (mode === 'steady') {
      store.setOnboardingProfile?.({ ...op, baseSalary: amount, salaryMode: 'takehome', salaryFreq: 'monthly', salaryByMonth: undefined });
    } else {
      const grid = months.map((m) => (m === '' ? amount : m));
      store.setOnboardingProfile?.({ ...op, baseSalary: amount, salaryMode: 'takehome', salaryFreq: 'monthly', salaryByMonth: grid });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? undefined : 'height'} style={s.scrim}>
        <View style={s.sheet}>
          <View style={s.grab} />
          <View style={s.head}>
            <Text style={s.title}>Your income</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={s.x}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={s.q}>How steady is it?</Text>
            {(['steady', 'varies'] as const).map((m) => (
              <TouchableOpacity key={m} accessibilityRole="button" style={[s.opt, mode === m && s.optOn]} onPress={() => setMode(m)}
                accessibilityLabel={m === 'steady' ? 'Same every month' : 'It varies month to month'}>
                <Text style={[s.optT, mode === m && s.optTOn]}>{mode === m ? '✓ ' : ''}{m === 'steady' ? 'Same every month' : 'It varies month to month'}</Text>
              </TouchableOpacity>
            ))}

            <Text style={s.q}>{mode === 'steady' ? 'What lands in your account each month?' : 'About how much in a typical month?'}</Text>
            <Text style={s.qsub}>{mode === 'steady' ? 'take-home, after tax — a close guess is fine' : "we'll start every month here — then adjust the ones that differ"}</Text>
            <TextInput style={s.input} keyboardType="decimal-pad" value={amount} onChangeText={applyTypical}
              placeholder="0" placeholderTextColor={Colors.textTertiary} accessibilityLabel="Monthly take-home amount" />

            {mode === 'varies' && (
              <>
                <Text style={s.q}>Which 12 months are you entering?</Text>
                <View style={s.frameRow}>
                  <TouchableOpacity accessibilityRole="button" style={[s.frameChip, frame === 'calendar' && s.frameChipOn]}
                    onPress={() => setFrame('calendar')} accessibilityLabel={`Calendar year ${thisYear}`}>
                    <Text style={[s.frameT, frame === 'calendar' && s.frameTOn]}>{frame === 'calendar' ? '✓ ' : ''}Calendar year {thisYear}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity accessibilityRole="button" style={[s.frameChip, frame === 'rolling' && s.frameChipOn]}
                    onPress={() => setFrame('rolling')} accessibilityLabel="The next 12 months from today">
                    <Text style={[s.frameT, frame === 'rolling' && s.frameTOn]}>{frame === 'rolling' ? '✓ ' : ''}Next 12 months</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.q}>Adjust the months that differ <Text style={s.qsub}>(tap a month)</Text></Text>
                <View style={s.grid}>
                  {order.map(({ slot, label, long }) => {
                    const val = months[slot] === '' ? amount : months[slot];
                    const differs = months[slot] !== '' && months[slot] !== amount;
                    return (
                      <TouchableOpacity key={label} accessibilityRole="button" style={[s.mo, differs && s.moHot]}
                        onPress={() => setEditMonth(slot)} accessibilityLabel={`${long}: ${val || 0} dollars. Tap to adjust.`}>
                        <Text style={s.moM}>{label}</Text>
                        <Text style={s.moV}>{val ? Math.round(num(val)).toLocaleString() : '—'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={s.qsub}>This yearly pattern repeats — adjust it any time.</Text>
                {editMonth != null && (
                  <View style={s.moEdit}>
                    <Text style={s.qsub}>{(order.find((o) => o.slot === editMonth) ?? { long: MONTHS[editMonth] }).long} amount</Text>
                    <TextInput style={s.input} keyboardType="decimal-pad" autoFocus
                      value={months[editMonth] === '' ? amount : months[editMonth]}
                      onChangeText={(v) => setMonths((m) => m.map((x, j) => (j === editMonth ? v : x)))}
                      accessibilityLabel={`${(order.find((o) => o.slot === editMonth) ?? { long: MONTHS[editMonth] }).long} take-home amount`} />
                    <TouchableOpacity accessibilityRole="button" onPress={() => setEditMonth(null)} accessibilityLabel="Done with this month">
                      <Text style={s.done}>Done ›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity accessibilityRole="button" style={s.saveBtn} onPress={save} accessibilityLabel="Save my income">
              <Text style={s.saveT}>Save my income</Text>
            </TouchableOpacity>
            <Text style={s.saved}>✓ Saved to your plan — Home, Cash flow, Budget and Plan all use this one answer.</Text>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,15,12,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.lg, maxHeight: '88%' },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: Colors.textPrimary },
  x: { fontSize: 17, fontWeight: '800', color: Colors.textSecondary },
  q: { fontSize: 15, color: Colors.textPrimary, marginTop: 14, fontWeight: '600' },
  qsub: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 1, fontWeight: '400' },
  opt: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, marginTop: 8 },
  optOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optT: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  optTOn: { fontWeight: '800', color: Colors.primaryDark },
  input: { borderWidth: 1.5, borderColor: Colors.borderStrong, borderRadius: Radii.md, padding: 12, fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, backgroundColor: Colors.bgSecondary, fontVariant: ['tabular-nums'] },
  frameRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  frameChip: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md },
  frameChipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  frameT: { fontSize: 13.5, fontWeight: '700', color: Colors.textSecondary },
  frameTOn: { color: Colors.primaryDark, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  mo: { width: '22.7%', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingVertical: 7, alignItems: 'center' },
  moHot: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  moM: { fontSize: 10.5, fontWeight: '800', color: Colors.textTertiary },
  moV: { fontSize: 12.5, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  moEdit: { marginTop: 10, padding: 12, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary },
  done: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 8 },
  saveBtn: { minHeight: 50, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  saveT: { fontSize: 16, fontWeight: '800', color: '#fff' },
  saved: { fontSize: 11.5, fontWeight: '600', color: Colors.primaryDark, marginTop: 10 },
});
