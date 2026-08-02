// THE one debt editor (B47 finding 11, founder-approved mock debt-editor-v1-2026-07-31).
// Net worth and Cash flow both render THIS sheet — the two drifted forms are gone.
// The form's shape follows how the debt is repaid:
//   installment  → the REAL monthly payment ↔ "paid off by" (enter either, the other is computed)
//   revolving    → cards keep the minimum + you-pay fields
//   due_in_full  → amount + due date; cash flow schedules it as a dated big-ticket, not a monthly row
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { useStore } from '../store/useStore';
import {
  DEBT_KINDS, debtKind, defaultPaymentType, monthsToClear, paymentToClearBy,
  type Debt, type DebtType,
} from '../domain/debt';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';
import { maskedMoney as money } from './useMoney';
import { currencySymbol } from '../domain/_shared/money';

const num = (s: string) => { const n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };

const SHAPES: { key: NonNullable<Debt['payment_type']>; label: string }[] = [
  { key: 'installment', label: 'Monthly payments' },
  { key: 'revolving', label: 'Card / revolving' },
  { key: 'due_in_full', label: 'Due in full' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMonthYear = (iso?: string) => {
  const m = iso?.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTH_NAMES[+m[2] - 1]} ${m[1]}` : '';
};
/** 'MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM' or 'YYYY' → ISO (typed dates stay forgiving; days kept). */
const parseMonthYear = (s: string): string | undefined => {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) return `${m[3]}-${String(+m[1]).padStart(2, '0')}-${String(+m[2]).padStart(2, '0')}`;
  m = t.match(/^(\d{1,2})\s*[\/\-.]\s*(\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${String(+m[1]).padStart(2, '0')}-01`;
  m = t.match(/^(\d{4})\s*[\/\-.]\s*(\d{1,2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-01`;
  m = t.match(/^(\d{4})$/);
  if (m) return `${m[1]}-12-01`;
  return undefined;
};
const monthsFromNow = (iso: string, now: Date): number => {
  const m = iso.match(/^(\d{4})-(\d{2})/)!;
  return (+m[1] * 12 + (+m[2] - 1)) - (now.getFullYear() * 12 + now.getMonth());
};
const isoInMonths = (months: number, now: Date): string => {
  const idx = now.getFullYear() * 12 + now.getMonth() + months;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}-01`;
};

export function DebtEditorSheet({ state, onClose }: { state: { open: boolean; edit?: Debt }; onClose: () => void }) {
  const store = useStore() as any;
  const editing = state.edit;
  const [kind, setKind] = useState<DebtType>('CREDIT_CARD'); const [inst, setInst] = useState('');
  const [bal, setBal] = useState(''); const [apr, setApr] = useState(''); const [pay, setPay] = useState('');
  const [due, setDue] = useState(''); const [monthly, setMonthly] = useState('');
  const [shape, setShape] = useState<NonNullable<Debt['payment_type']>>('revolving');
  const [shapeTouched, setShapeTouched] = useState(false);   // user override survives kind changes
  const [endBy, setEndBy] = useState('');                    // installment: "paid off by" (MM/YYYY)
  const [dueDate, setDueDate] = useState('');                // due_in_full: the lump's date
  const [startsOn, setStartsOn] = useState('');              // installment: payments START here (deferred loans)
  const [drives, setDrives] = useState<'payment' | 'date'>('payment');   // which field the user entered last

  useEffect(() => {
    if (!state.open) return;
    const k = (editing?.debt_type as DebtType) ?? 'CREDIT_CARD';
    setKind(k); setInst(editing?.institution ?? '');
    setBal(editing ? String(editing.remaining_balance) : ''); setApr(editing ? String(editing.interest_rate_apr * 100) : '');
    setPay(editing ? String(editing.minimum_monthly_payment) : '');
    setDue(editing?.due_day ? String(editing.due_day) : ''); setMonthly(editing?.monthly_payment ? String(editing.monthly_payment) : '');
    setShape(editing?.payment_type ?? defaultPaymentType(k)); setShapeTouched(!!editing?.payment_type);
    const pm = editing?.payoff_date?.match(/^(\d{4})-(\d{2})/);
    setEndBy(pm ? `${pm[2]}/${pm[1]}` : ''); setDueDate(pm ? `${pm[2]}/${pm[1]}` : '');
    const fp = editing?.first_payment_date?.match(/^(\d{4})-(\d{2})/);
    setStartsOn(fp ? `${fp[2]}/${fp[1]}` : '');
    setDrives('payment');
  }, [state.open]);

  const pickKind = (k: DebtType) => { setKind(k); if (!shapeTouched) setShape(defaultPaymentType(k)); };

  const amt = num(bal);
  const aprDec = num(apr) / 100;
  const now = new Date();

  // installment two-way math — whichever field the user filled last drives, the other is computed
  const payIn = num(monthly) || num(pay);
  const endIso = parseMonthYear(endBy);
  let derivedLine = '';
  let calcPayment = payIn;              // what saves as the installment's real payment
  let calcPayoffIso: string | undefined = endIso;
  if (shape === 'installment' && amt > 0) {
    if (drives === 'payment' && payIn > 0) {
      const months = monthsToClear(amt, aprDec, payIn);
      if (months == null) derivedLine = `⚠ ${money(payIn)}/month doesn't cover the interest — this never pays off`;
      else { calcPayoffIso = isoInMonths(months, now); derivedLine = `✓ paid off by ${fmtMonthYear(calcPayoffIso)} — computed from your balance, rate and payment`; }
    } else if (drives === 'date' && endIso) {
      const months = Math.max(1, monthsFromNow(endIso, now));
      calcPayment = paymentToClearBy(amt, aprDec, months);
      derivedLine = `✓ that takes ${money(calcPayment)}/month — computed from your balance, rate and end date`;
    }
  }

  // revolving: the approved mock's "✓ clear in 17 months at $400/mo" line (you-pay, else the minimum)
  const cardPay = num(monthly) || num(pay);
  const cardMonths = shape === 'revolving' && amt > 0 && cardPay > 0 ? monthsToClear(amt, aprDec, cardPay) : null;

  const dueIso = parseMonthYear(dueDate);
  const startIso = parseMonthYear(startsOn);
  const monthsToDue = dueIso ? Math.max(0, monthsFromNow(dueIso, now)) : null;
  const ready = amt > 0 && (shape !== 'due_in_full' || !!dueIso);

  const save = () => {
    if (!ready) return;
    const label = inst.trim() || debtKind(kind)?.label || 'Debt';
    const dd = Math.min(31, Math.max(0, Math.round(num(due)))) || undefined;
    const base = { label, institution: inst.trim(), debt_type: kind, remaining_balance: amt, interest_rate_apr: aprDec, payment_type: shape };
    const patch =
      shape === 'due_in_full'
        // a lump has NO monthly payment — it lands as a dated big-ticket in cash flow instead
        ? { ...base, minimum_monthly_payment: 0, monthly_payment: undefined, due_day: undefined, payoff_date: dueIso }
        : shape === 'installment'
          // the real payment IS the obligation (there's no separate "minimum" on a mortgage)
          ? { ...base, minimum_monthly_payment: calcPayment, monthly_payment: calcPayment, due_day: dd, payoff_date: calcPayoffIso, first_payment_date: startIso }
          : { ...base, minimum_monthly_payment: num(pay), monthly_payment: monthly.trim() === '' ? undefined : (num(monthly) || num(pay)), due_day: dd, payoff_date: undefined };
    if (editing) store.updateLiability?.(editing.debt_id, patch); else store.addLiability?.(patch);
    onClose();
  };
  // walk row 23: same confirm rule for debts — a deleted debt RAISES net worth silently otherwise.
  const remove = () => {
    if (!editing) { onClose(); return; }
    Alert.alert(
      `Remove ${editing.label}?`,
      `Its ${money(Math.round(editing.remaining_balance || 0))} debt comes off your list. This can't be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { store.deleteLiability?.(editing.debt_id); onClose(); } },
      ],
    );
  };

  return (
    <KeyboardAwareSheet open={state.open} onClose={onClose} title={editing ? 'Edit debt' : 'Add debt'}>
      <View style={sh.chips}>
        {DEBT_KINDS.map((ko) => (
          <TouchableOpacity key={ko.id} style={[sh.chip, kind === ko.id && sh.chipOn]} accessibilityRole="button" accessibilityState={{ selected: kind === ko.id }} accessibilityLabel={ko.label} onPress={() => pickKind(ko.id)}>
            <Text style={sh.chipTxt}>{ko.icon} {ko.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={sh.input} placeholder="Lender / name (e.g. Chase Sapphire)" placeholderTextColor={Colors.textTertiary} value={inst} onChangeText={setInst} />
      <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><TextInput style={sh.amtIn} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textTertiary} value={bal} onChangeText={setBal} /></View>

      <Text style={sh.lbl}>How is it repaid?</Text>
      <View style={sh.segRow}>
        {SHAPES.map((s) => (
          <TouchableOpacity key={s.key} style={[sh.seg, shape === s.key && sh.segOn]} accessibilityRole="button" accessibilityState={{ selected: shape === s.key }} accessibilityLabel={s.label} onPress={() => { setShape(s.key); setShapeTouched(true); }}>
            <Text style={[sh.segTxt, shape === s.key && sh.segTxtOn]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {shape === 'due_in_full' ? (<>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due date (month/year)</Text><TextInput style={sh.input} keyboardType="numbers-and-punctuation" placeholder="12/2026" placeholderTextColor={Colors.textTertiary} value={dueDate} onChangeText={setDueDate} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate % (optional)</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="0%" placeholderTextColor={Colors.textTertiary} value={apr} onChangeText={setApr} /></View>
        </View>
        {amt > 0 && dueIso
          ? <Text style={sh.derived}>✓ lands as a {money(amt)} big-ticket in {fmtMonthYear(dueIso)}'s cash flow and on the bill calendar{monthsToDue != null && monthsToDue > 0 ? ` — ${monthsToDue} month${monthsToDue === 1 ? '' : 's'} of warning` : ''}, not a surprise</Text>
          : <Text style={sh.derivedMuted}>Enter the amount and its due date — no monthly payment to track.</Text>}
      </>) : shape === 'installment' ? (<>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate %</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="6.5" placeholderTextColor={Colors.textTertiary} value={apr} onChangeText={setApr} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due day</Text><TextInput style={sh.input} keyboardType="number-pad" placeholder="1–31" placeholderTextColor={Colors.textTertiary} value={due} onChangeText={setDue} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Monthly payment (what you pay)</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={monthly} onChangeText={(t) => { setMonthly(t); setDrives('payment'); }} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Or: paid off by</Text><TextInput style={sh.input} keyboardType="numbers-and-punctuation" placeholder="03/2047" placeholderTextColor={Colors.textTertiary} value={endBy} onChangeText={(t) => { setEndBy(t); setDrives('date'); }} /></View>
        </View>
        {derivedLine
          ? <Text style={derivedLine.startsWith('⚠') ? sh.derivedWarn : sh.derived}>{derivedLine}</Text>
          : <Text style={sh.derivedMuted}>Enter either one — the other is computed from your balance and rate.</Text>}
        <Text style={sh.lbl}>Payments start (month/year — only for loans that haven't started yet)</Text>
        <TextInput style={sh.input} keyboardType="numbers-and-punctuation" placeholder="already paying" placeholderTextColor={Colors.textTertiary} value={startsOn} onChangeText={setStartsOn} />
      </>) : (<>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate %</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="19.99" placeholderTextColor={Colors.textTertiary} value={apr} onChangeText={setApr} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due day</Text><TextInput style={sh.input} keyboardType="number-pad" placeholder="1–31" placeholderTextColor={Colors.textTertiary} value={due} onChangeText={setDue} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Min payment /mo</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="$0" placeholderTextColor={Colors.textTertiary} value={pay} onChangeText={setPay} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>You pay /mo</Text><TextInput style={sh.input} keyboardType="decimal-pad" placeholder="≥ min" placeholderTextColor={Colors.textTertiary} value={monthly} onChangeText={setMonthly} /></View>
        </View>
        {cardMonths != null
          ? <Text style={sh.derived}>✓ clear in {cardMonths} month{cardMonths === 1 ? '' : 's'} at {money(cardPay)}/mo</Text>
          : cardPay > 0 && amt > 0
            ? <Text style={sh.derivedWarn}>⚠ {money(cardPay)}/month doesn't cover the interest — this never pays off</Text>
            : null}
      </>)}

      <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} accessibilityRole="button" accessibilityLabel={editing ? 'Save debt' : 'Add debt'} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} {shape === 'revolving' ? 'card' : shape === 'due_in_full' ? 'loan' : (debtKind(kind)?.label.toLowerCase() ?? 'debt')}</Text></TouchableOpacity>
      {editing && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove debt" onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
    </KeyboardAwareSheet>
  );
}

const sh = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  chip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  lbl: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPre: { fontSize: 26, fontWeight: '800', color: Colors.textSecondary },
  amtIn: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  segRow: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, paddingHorizontal: 4 },
  segOn: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  segTxt: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  segTxtOn: { color: Colors.cardBg },
  derived: { fontSize: 12, color: Colors.gainText, fontWeight: '600', marginTop: Spacing.sm },
  derivedWarn: { fontSize: 12, color: Colors.red, fontWeight: '600', marginTop: Spacing.sm },
  derivedMuted: { fontSize: 12, color: Colors.textTertiary, marginTop: Spacing.sm },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveTxt: { color: '#fff', fontSize: 16, fontWeight: '800' },
  remove: { color: Colors.red, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
});
