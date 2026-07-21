// Income manager — see EVERY income source you entered and add/update them in one place.
// Pulls structured sources from onboarding (salary/bonus/equity/rental), one-off incomes from the
// store, and investment income (dividends/interest) from the transaction ledger.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform , Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { incomeFromOnboarding, totalGrossAnnual, SALARY_PERIODS } from '../domain/income';
import { investmentIncomeAnnual } from '../domain/transactions';
import { interestIncomeAnnual } from '../domain/bonds';
import { RsuEditor, RentalEditor } from '../onboarding/modules';   // reuse the rich grants/rentals editors
import type { StepCtx } from '../onboarding/modules';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// annualize a structured income source for display
function annualOf(s: any): number {
  if (s.frequency === 'MONTHLY') return Math.round((s.gross_amount - (s.operating_expenses || 0)) * 12);
  return Math.round(s.gross_amount);   // ANNUAL or ONETIME shown as-is
}
const freqLabel = (f: string) => (f === 'MONTHLY' ? '/yr (from monthly)' : f === 'ONETIME' ? 'one-time' : '/yr');

export default function IncomeManagerScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const uid = store.user?.uid ?? 'local';
  const incomes = store.incomes ?? [];               // one-off entries
  const transactions = store.transactions ?? [];
  const [baseOpen, setBaseOpen] = useState(false);
  const [editKey, setEditKey] = useState<null | 'bonusAnnual' | 'signingOnetime'>(null);
  const [rich, setRich] = useState<null | 'equity' | 'rental'>(null);   // reuse onboarding RsuEditor/RentalEditor
  const [selfOpen, setSelfOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  // Shim the onboarding StepCtx onto the live profile so the reused editors read/write op fields directly.
  const editorCtx: StepCtx = {
    status: (op.status ?? null) as any, tracks: [] as any, answers: op,
    setAnswer: (k, v) => store.setOnboardingProfile?.({ ...(store.onboardingProfile ?? {}), [k]: v }),
  };

  const investIncome = investmentIncomeAnnual(transactions) + interestIncomeAnnual(store.assetAccounts ?? []);
  // When real holdings/bonds report income, drop the onboarding interest/dividends ESTIMATE so we
  // don't double-count it with the actual "Investment income" row below.
  const opLive = useMemo(() => (investIncome > 0 ? { ...op, invAnnual: 0 } : op), [op, investIncome]);
  const sources = useMemo(() => incomeFromOnboarding(uid, opLive).sources, [opLive, uid]);
  const oneOffTotal = incomes.reduce((t: number, i: any) => t + (i.amount || 0), 0);
  const totalAnnual = Math.round(totalGrossAnnual(opLive)) + investIncome + oneOffTotal;

  // What opens when you tap a source row (null = not directly editable here).
  const openEditorFor = (label: string): null | (() => void) => {
    switch (label) {
      case 'Base salary': return () => setBaseOpen(true);
      case 'Bonus': return () => setEditKey('bonusAnnual');
      case 'Signing bonus': return () => setEditKey('signingOnetime');
      case 'Equity comp': return () => setRich('equity');
      case 'Rental property': return () => setRich('rental');
      case 'Self-employment': return () => setSelfOpen(true);
      default: return null;
    }
  };

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>YOUR INCOME</Text>

      <View style={styles.summary}>
        <Text style={styles.sumVal}>{money(totalAnnual)}</Text>
        <Text style={styles.sumLab}>total income / year (gross)</Text>
      </View>

      {/* RECURRING / STRUCTURED SOURCES */}
      <Text style={styles.section}>WHAT YOU ENTERED</Text>
      <View style={styles.card}>
        {sources.map((s: any) => {
          const open = openEditorFor(s.label);
          const editable = !!open;
          return (
            <TouchableOpacity key={s.income_source_id} style={styles.row} disabled={!editable}
              onPress={() => open?.()}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.label}</Text>
                <Text style={styles.rowSub}>{s.who_earns === 'partner' ? 'partner · ' : ''}{freqLabel(s.frequency)}{s.operating_expenses ? ` · net of ${money(s.operating_expenses)}/mo costs` : ''}{editable ? ' · tap to edit' : ''}</Text>
              </View>
              <Text style={styles.rowVal}>{money(annualOf(s))}</Text>
            </TouchableOpacity>
          );
        })}
        {sources.length === 0 && (
          <View>
            <Text style={styles.empty}>No income captured yet.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add your income" style={styles.emptyBtn} onPress={() => setBaseOpen(true)}>
              <Text style={styles.emptyBtnT}>＋ Add your income</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* INVESTMENT INCOME (from the ledger) */}
      <Text style={styles.section}>INVESTMENT INCOME</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>Dividends, interest & coupons</Text>
            <Text style={styles.rowSub}>{investIncome > 0 ? 'from your holdings & bonds (last 12 months + bond coupons)' : 'recorded when you log a cash dividend or add a bond'}</Text>
          </View>
          <Text style={styles.rowVal}>{money(investIncome)}</Text>
        </View>
        <Text style={styles.note}>Reinvested dividends grow the holding instead of paying cash, so they're not counted as income here. Log dividends from Portfolio → Record transaction.</Text>
      </View>

      {/* ONE-OFF INCOME */}
      <Text style={styles.section}>ONE-OFF INCOME</Text>
      <View style={styles.card}>
        {incomes.length === 0 && <Text style={styles.empty}>None logged.</Text>}
        {incomes.map((i: any) => (
          <View key={i.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{i.source || i.type}</Text>
              <Text style={styles.rowSub}>{i.date}{i.notes ? ` · ${i.notes}` : ''}</Text>
            </View>
            <Text style={styles.rowVal}>{money(i.amount)}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Delete ${i.source || i.type}`} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={() => Alert.alert('Delete this income?', `${i.source || i.type} · ${money(i.amount)}`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => store.deleteIncome(i.id) },
              ])}><Text style={styles.del}>✕</Text></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add one-off income" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add one-off income</Text></TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      <BasePayEditor open={baseOpen} op={op} onClose={() => setBaseOpen(false)}
        onSave={(p) => { store.setOnboardingProfile?.({ ...op, ...p }); setBaseOpen(false); }} />
      <AmountEditor open={editKey != null} title={editKey === 'bonusAnnual' ? 'Annual bonus' : 'Signing bonus (one-time)'}
        value={editKey ? num(op[editKey]) : 0} onClose={() => setEditKey(null)}
        onSave={(v) => { if (editKey) store.setOnboardingProfile?.({ ...op, [editKey]: String(v) }); setEditKey(null); }} />
      <AddIncome open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(source, amount) => { store.addIncome?.({ type: 'other', amount, source, date: new Date().toISOString().slice(0, 10) }); setAddOpen(false); }} />

      {/* Equity comp + Rental — reuse the rich onboarding editors (grants / multiple properties), live-backed */}
      <Modal visible={rich != null} transparent animationType="slide" onRequestClose={() => setRich(null)}>
        <View style={styles.richWrap}>
          <View style={styles.richBar}>
            <Text style={styles.richTitle}>{rich === 'equity' ? 'Equity comp' : 'Rental income'}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done editing" onPress={() => setRich(null)}><Text style={styles.richDone}>Done</Text></TouchableOpacity>
          </View>
          <ScrollView automaticallyAdjustKeyboardInsets contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
            {rich === 'equity' && <RsuEditor ctx={editorCtx} />}
            {rich === 'rental' && <RentalEditor ctx={editorCtx} />}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      <SelfEmploymentEditor open={selfOpen} op={op} onClose={() => setSelfOpen(false)}
        onSave={(p) => { store.setOnboardingProfile?.({ ...op, ...p }); setSelfOpen(false); }} />
    </ScrollView>
  );
}

// ── self-employment editor (net amount + per year / per month) ──
function SelfEmploymentEditor({ open, op, onClose, onSave }: { open: boolean; op: any; onClose: () => void; onSave: (p: any) => void }) {
  const [amt, setAmt] = useState('');
  const [freq, setFreq] = useState<'annual' | 'monthly'>('annual');
  React.useEffect(() => { if (open) { setAmt(op.seAmount ? String(op.seAmount) : ''); setFreq(op.seFreq === 'monthly' ? 'monthly' : 'annual'); } }, [open]);
  const annual = num(amt) * (freq === 'monthly' ? 12 : 1);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.sheetT}>Self-employment income</Text>
          <Text style={styles.fieldL}>Net amount (after business expenses)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={amt} onChangeText={setAmt} placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
          <Text style={styles.fieldL}>How often</Text>
          <View style={styles.chips}>
            {(['annual', 'monthly'] as const).map((f) => (
              <TouchableOpacity key={f} accessibilityRole="button" accessibilityLabel={f === 'annual' ? 'Per year' : 'Per month'} style={[styles.chip, freq === f && styles.chipOn]} onPress={() => setFreq(f)}>
                <Text style={[styles.chipT, freq === f && styles.chipTOn]}>{f === 'annual' ? 'Per year' : 'Per month'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save self-employment income" style={styles.saveBtn}
            onPress={() => onSave({ seAmount: num(amt) > 0 ? String(num(amt)) : '', seFreq: freq })}>
            <Text style={styles.saveBtnT}>Save · {money(annual)}/yr</Text>
          </TouchableOpacity>
          <View style={{ height: 16 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── base-pay editor (amount + frequency + gross/take-home) ──
const FREQS: { k: string; label: string }[] = [
  { k: 'weekly', label: 'Weekly' }, { k: 'biweekly', label: 'Biweekly' }, { k: 'monthly', label: 'Monthly' }, { k: 'annual', label: 'Annual' },
];
function BasePayEditor({ open, op, onClose, onSave }: { open: boolean; op: any; onClose: () => void; onSave: (p: any) => void }) {
  const [amt, setAmt] = useState('');
  const [freq, setFreq] = useState('annual');
  const [mode, setMode] = useState<'gross' | 'takehome'>('gross');
  React.useEffect(() => { if (open) { setAmt(op.baseSalary ? String(op.baseSalary) : ''); setFreq(op.salaryFreq ?? 'annual'); setMode(op.salaryMode === 'takehome' ? 'takehome' : 'gross'); } }, [open]);
  const annual = num(amt) * (SALARY_PERIODS[freq] ?? 1);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Base pay</Text>
        <Text style={styles.fieldL}>Amount</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={amt} onChangeText={setAmt} placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
        <Text style={styles.fieldL}>How often</Text>
        <View style={styles.chips}>{FREQS.map((f) => (
          <TouchableOpacity key={f.k} style={[styles.chip, freq === f.k && styles.chipOn]} onPress={() => setFreq(f.k)}><Text style={[styles.chipT, freq === f.k && styles.chipTOn]}>{f.label}</Text></TouchableOpacity>
        ))}</View>
        <Text style={styles.fieldL}>This is</Text>
        <View style={styles.chips}>
          <TouchableOpacity style={[styles.chip, mode === 'gross' && styles.chipOn]} onPress={() => setMode('gross')}><Text style={[styles.chipT, mode === 'gross' && styles.chipTOn]}>Gross (before tax)</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.chip, mode === 'takehome' && styles.chipOn]} onPress={() => setMode('takehome')}><Text style={[styles.chipT, mode === 'takehome' && styles.chipTOn]}>Take-home</Text></TouchableOpacity>
        </View>
        {/* B-40: a per-month salary table takes precedence over a flat amount, so editing base pay to
            a flat figure must clear that table — otherwise the edit silently does nothing. */}
        <TouchableOpacity style={[styles.saveBtn, num(amt) <= 0 && { opacity: 0.4 }]} disabled={num(amt) <= 0}
          onPress={() => onSave({ baseSalary: String(num(amt)), salaryFreq: freq, salaryMode: mode, salaryByMonth: undefined, salaryMonthMode: undefined })}>
          <Text style={styles.saveBtnT}>Save · {money(annual)}/yr</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AmountEditor({ open, title, value, onClose, onSave }: { open: boolean; title: string; value: number; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState('');
  React.useEffect(() => { if (open) setV(value ? String(value) : ''); }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>{title}</Text>
        <TextInput style={[styles.input, { marginTop: 12 }]} keyboardType="decimal-pad" value={v} onChangeText={setV} placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(num(v))}><Text style={styles.saveBtnT}>Save</Text></TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function AddIncome({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (source: string, amount: number) => void }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  React.useEffect(() => { if (open) { setSource(''); setAmount(''); } }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>Add one-off income</Text>
        <Text style={styles.fieldL}>What was it?</Text>
        <TextInput style={styles.input} value={source} onChangeText={setSource} placeholder="e.g. Gift, stock sale, freelance" placeholderTextColor={Colors.textTertiary} />
        <Text style={styles.fieldL}>Amount</Text>
        <TextInput style={styles.input} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor={Colors.textTertiary} />
        <TouchableOpacity style={[styles.saveBtn, (num(amount) <= 0 || !source.trim()) && { opacity: 0.4 }]} disabled={num(amount) <= 0 || !source.trim()}
          onPress={() => onSave(source.trim(), num(amount))}><Text style={styles.saveBtnT}>Add</Text></TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  eyebrow: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 8 },
  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginTop: 12, alignItems: 'center' },
  sumVal: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  section: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.5, marginTop: 18, marginBottom: 6 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.bgTertiary },
  rowName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  rowSub: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 2 },
  rowVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  del: { fontSize: 17, color: Colors.textSecondary, paddingHorizontal: 8, paddingVertical: 8 },
  empty: { fontSize: 13, color: Colors.textSecondary, paddingVertical: 12, textAlign: 'center' },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  note: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginTop: 8 },
  addLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  richWrap: { flex: 1, backgroundColor: Colors.bgSecondary },
  richBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#fff' },
  richTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  richDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipT: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  chipTOn: { color: Colors.primaryDark },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
