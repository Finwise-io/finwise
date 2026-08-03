// Big one-time costs (founder-approved mock big-costs-v1-2026-08-01: "name it, date it, the odds
// count it"). A roof, a car, a wedding — money that leaves ONCE, in a year you can name. Each entry
// is subtracted in its year inside the SAME simulation the Plan needle runs; the screen says plainly
// what the list did to the odds. Empty state = the honest default: no entries means the plan
// quietly assumes no big one-time costs.
import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney, spokenMoney } from '../components/useMoney';
import { KeyboardAwareSheet } from '../components/KeyboardAwareSheet';
import { resolveNetWorthRows } from '../domain/snapshot';
import { selectWillItLast } from '../domain/retirement/willItLast';
import { simulate } from '../domain/retirement';

const num = (s: string) => { const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

export default function BigCostsScreen() {
  const store = useStore() as any;
  const op = store.onboardingProfile ?? {};
  const A = store.retirementAssumptions ?? {};
  const uid = store.user?.uid ?? 'local';
  const costs = (store.bigCosts ?? []) as { id: string; label: string; amount: number; year: number }[];
  const [sheet, setSheet] = useState<{ open: boolean; edit?: typeof costs[0] }>({ open: false });

  const { accounts } = resolveNetWorthRows(uid, op, store.nwSeeded ?? false, store.assetAccounts ?? [], store.liabilities ?? []);
  // the honest delta: the SAME selector with and without the list — never a separate model
  const withCosts = useMemo(
    () => selectWillItLast({ op, accounts, assumptions: A, bigCosts: costs, inflationRate: store.inflationRate, employmentStatus: store.employmentStatus }),
    [op, accounts, A, costs, store.inflationRate, store.employmentStatus]);
  const withoutChance = useMemo(() => {
    if (!withCosts.captured || withCosts.chance == null || !withCosts.inputs || costs.length === 0) return null;
    return simulate({ ...withCosts.inputs, one_off_costs: [] }).chance_of_success;
  }, [withCosts, costs.length]);

  const total = costs.reduce((t, c) => t + (c.amount || 0), 0);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Text style={s.tagline}>We lay it out. You decide.</Text>
      <View style={s.card}>
        <Text style={s.kicker}>YOUR BIG ONE-TIME COSTS</Text>
        {costs.length === 0 ? (
          <>
            <Text style={s.emptyBody}>A new roof, replacing the car, a family wedding — money that leaves once, in a year you can name. Add it and the odds account for it; leave it out and the plan quietly assumes it never happens.</Text>
            <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => setSheet({ open: true })}
              accessibilityLabel="Add your first big cost">
              <Text style={s.ctaTxt}>＋ Add your first big cost</Text>
            </TouchableOpacity>
            <Text style={s.note}>Nothing here yet — your odds currently assume no big one-time costs.</Text>
          </>
        ) : (
          <>
            {costs.map((c) => (
              <TouchableOpacity key={c.id} accessibilityRole="button" style={s.row}
                accessibilityLabel={`${c.label}, ${spokenMoney(c.amount)} in ${c.year}. Opens the editor.`}
                onPress={() => setSheet({ open: true, edit: c })}>
                <Text style={s.rowL}>{c.label}</Text>
                <Text style={s.rowV}>{maskedMoney(c.amount)} · {c.year}</Text>
              </TouchableOpacity>
            ))}
            <View style={[s.row, s.totalRow]}>
              <Text style={[s.rowL, s.strong]}>Total planned</Text>
              <Text style={[s.rowV, s.strong]}>{maskedMoney(total)}</Text>
            </View>
            {withoutChance != null && withCosts.chance != null && (
              <Text style={s.delta}>
                {withoutChance === withCosts.chance
                  ? `These don't move your odds (${withCosts.chance}%) — the plan absorbs them.`
                  : `These ${withoutChance > withCosts.chance ? 'lower' : 'raise'} your odds from ${withoutChance}% to ${withCosts.chance}% — already counted in the Plan tab's needle.`}
              </Text>
            )}
            <TouchableOpacity accessibilityRole="button" style={s.cta} onPress={() => setSheet({ open: true })}
              accessibilityLabel="Add a big cost">
              <Text style={s.ctaTxt}>＋ Add a big cost ›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <BigCostSheet state={sheet} onClose={() => setSheet({ open: false })} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function BigCostSheet({ state, onClose }: { state: { open: boolean; edit?: { id: string; label: string; amount: number; year: number } }; onClose: () => void }) {
  const store = useStore() as any;
  const editing = state.edit;
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [year, setYear] = useState('');
  React.useEffect(() => {
    if (!state.open) return;
    setLabel(editing?.label ?? ''); setAmount(editing ? String(editing.amount) : ''); setYear(editing ? String(editing.year) : '');
  }, [state.open]);
  const yr = Math.round(num(year));
  const nowYear = new Date().getFullYear();
  const ready = num(amount) > 0 && yr >= nowYear && yr <= nowYear + 60 && label.trim().length > 0;
  const save = () => {
    if (!ready) return;
    const patch = { label: label.trim(), amount: num(amount), year: yr };
    if (editing) store.updateBigCost?.(editing.id, patch); else store.addBigCost?.(patch);
    onClose();
  };
  const remove = () => {
    if (!editing) return;
    Alert.alert(`Remove ${editing.label}?`, 'The odds will stop counting it.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { store.deleteBigCost?.(editing.id); onClose(); } },
    ]);
  };
  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit big cost' : 'Add a big cost'}>
      <Text style={s.lbl}>What is it?</Text>
      <TextInput style={s.input} placeholder="New roof" placeholderTextColor={Colors.textTertiary} value={label} onChangeText={setLabel} />
      <Text style={s.lbl}>About how much? (today's dollars)</Text>
      <TextInput style={s.input} keyboardType="decimal-pad" placeholder="$28,000" placeholderTextColor={Colors.textTertiary} value={amount} onChangeText={setAmount} />
      <Text style={s.lbl}>Which year?</Text>
      <TextInput style={s.input} keyboardType="number-pad" placeholder={String(nowYear + 2)} placeholderTextColor={Colors.textTertiary} value={year} onChangeText={setYear} />
      <TouchableOpacity accessibilityRole="button" style={[s.saveBtn, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}
        accessibilityLabel="Add it — the odds will account for it">
        <Text style={s.saveTxt}>{editing ? 'Save' : 'Add it — the odds will account for it'}</Text>
      </TouchableOpacity>
      <Text style={s.note}>An estimate is fine — a rough year beats leaving it out. Inflation is applied for you.</Text>
      {editing && <TouchableOpacity accessibilityRole="button" onPress={remove} accessibilityLabel={`Remove ${editing.label}`}><Text style={s.remove}>Remove</Text></TouchableOpacity>}
    </KeyboardAwareSheet>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  tagline: { fontSize: 13, color: Colors.textSecondary, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.lg },
  kicker: { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, letterSpacing: 0.6, marginBottom: 6 },
  emptyBody: { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, minHeight: 44, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowL: { fontSize: 15, color: Colors.textPrimary, flexShrink: 1 },
  rowV: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  totalRow: { borderBottomWidth: 0 },
  strong: { fontWeight: '800' },
  delta: { fontSize: 12.5, color: Colors.amber, fontWeight: '700', marginTop: 8, lineHeight: 18 },
  cta: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 12, minHeight: 44 },
  ctaTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  note: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 8, lineHeight: 16 },
  lbl: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2 },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, minHeight: 44 },
  saveTxt: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  remove: { color: Colors.red, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
});
