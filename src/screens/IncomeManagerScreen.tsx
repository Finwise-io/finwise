// Income manager — see EVERY income source you entered and add/update them in one place.
// Pulls structured sources from onboarding (salary/bonus/equity/rental), one-off incomes from the
// store, and investment income (dividends/interest) from the transaction ledger.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { incomeFromOnboarding, totalGrossAnnual, SALARY_PERIODS } from '../domain/income';
import { investmentIncomeAnnual } from '../domain/transactions';

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
  const [addOpen, setAddOpen] = useState(false);

  const sources = useMemo(() => incomeFromOnboarding(uid, op).sources, [op, uid]);
  const investIncome = investmentIncomeAnnual(transactions);
  const oneOffTotal = incomes.reduce((t: number, i: any) => t + (i.amount || 0), 0);
  const totalAnnual = Math.round(totalGrossAnnual(op)) + investIncome + oneOffTotal;

  const editableField = (s: any): null | 'bonusAnnual' | 'signingOnetime' =>
    s.label === 'Bonus' ? 'bonusAnnual' : s.label === 'Signing bonus' ? 'signingOnetime' : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>YOUR INCOME</Text>

      <View style={styles.summary}>
        <Text style={styles.sumVal}>{money(totalAnnual)}</Text>
        <Text style={styles.sumLab}>total income / year (gross)</Text>
      </View>

      {/* RECURRING / STRUCTURED SOURCES */}
      <Text style={styles.section}>WHAT YOU ENTERED</Text>
      <View style={styles.card}>
        {sources.map((s: any) => {
          const ek = editableField(s);
          const isBase = s.label === 'Base salary';
          const editable = isBase || !!ek;
          return (
            <TouchableOpacity key={s.income_source_id} style={styles.row} disabled={!editable}
              onPress={() => isBase ? setBaseOpen(true) : ek ? setEditKey(ek) : undefined}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{s.label}</Text>
                <Text style={styles.rowSub}>{s.who_earns === 'partner' ? 'partner · ' : ''}{freqLabel(s.frequency)}{s.operating_expenses ? ` · net of ${money(s.operating_expenses)}/mo costs` : ''}{editable ? ' · tap to edit' : ''}</Text>
              </View>
              <Text style={styles.rowVal}>{money(annualOf(s))}</Text>
            </TouchableOpacity>
          );
        })}
        {sources.length === 0 && <Text style={styles.empty}>No income captured yet.</Text>}
      </View>

      {/* INVESTMENT INCOME (from the ledger) */}
      <Text style={styles.section}>INVESTMENT INCOME</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>Dividends & interest</Text>
            <Text style={styles.rowSub}>{investIncome > 0 ? 'cash payouts, last 12 months · from your holdings' : 'recorded automatically when you log a cash dividend'}</Text>
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
            <TouchableOpacity onPress={() => store.deleteIncome(i.id)}><Text style={styles.del}>✕</Text></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add one-off income</Text></TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      <BasePayEditor open={baseOpen} op={op} onClose={() => setBaseOpen(false)}
        onSave={(p) => { store.setOnboardingProfile?.({ ...op, ...p }); setBaseOpen(false); }} />
      <AmountEditor open={editKey != null} title={editKey === 'bonusAnnual' ? 'Annual bonus' : 'Signing bonus (one-time)'}
        value={editKey ? num(op[editKey]) : 0} onClose={() => setEditKey(null)}
        onSave={(v) => { if (editKey) store.setOnboardingProfile?.({ ...op, [editKey]: String(v) }); setEditKey(null); }} />
      <AddIncome open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(source, amount) => { store.addIncome?.({ type: 'other', amount, source, date: new Date().toISOString().slice(0, 10) }); setAddOpen(false); }} />
    </ScrollView>
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
        <TouchableOpacity style={[styles.saveBtn, num(amt) <= 0 && { opacity: 0.4 }]} disabled={num(amt) <= 0}
          onPress={() => onSave({ baseSalary: String(num(amt)), salaryFreq: freq, salaryMode: mode })}>
          <Text style={styles.saveBtnT}>Save · {money(annual)}/yr</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function AmountEditor({ open, title, value, onClose, onSave }: { open: boolean; title: string; value: number; onClose: () => void; onSave: (v: number) => void }) {
  const [v, setV] = useState('');
  React.useEffect(() => { if (open) setV(value ? String(value) : ''); }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <Text style={styles.sheetT}>{title}</Text>
        <TextInput style={[styles.input, { marginTop: 12 }]} keyboardType="decimal-pad" value={v} onChangeText={setV} placeholder="0" placeholderTextColor={Colors.textTertiary} autoFocus />
        <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(num(v))}><Text style={styles.saveBtnT}>Save</Text></TouchableOpacity>
      </View>
    </Modal>
  );
}

function AddIncome({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (source: string, amount: number) => void }) {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  React.useEffect(() => { if (open) { setSource(''); setAmount(''); } }, [open]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
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
  rowName: { fontSize: 14.5, fontWeight: '700', color: Colors.textPrimary },
  rowSub: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 2 },
  rowVal: { fontSize: 14.5, fontWeight: '800', color: Colors.textPrimary },
  del: { fontSize: 15, color: Colors.textTertiary, paddingHorizontal: 4 },
  empty: { fontSize: 13, color: Colors.textTertiary, paddingVertical: 12, textAlign: 'center' },
  note: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 8 },
  addLink: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 12 },

  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
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
