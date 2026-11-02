// THE one debt editor (B47 finding 11, founder-approved mock debt-editor-v1-2026-07-31).
// Net worth and Cash flow both render THIS sheet — the two drifted forms are gone.
// The form's shape follows how the debt is repaid:
//   installment  → the REAL monthly payment ↔ "paid off by" (enter either, the other is computed)
//   revolving    → cards keep the minimum + you-pay fields
//   due_in_full  → amount + due date; cash flow schedules it as a dated big-ticket, not a monthly row
import { MoneyBox } from './MoneyBox';   // every money box, one component (DEC-8385)
import { plural } from '../domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors, Spacing, Radii } from '../utils/theme';
import { useStore } from '../store/useStore';
import {
  DEBT_KINDS, debtKind, defaultPaymentType, monthsToClear, paymentToClearBy, rateNotEntered,
  type Debt, type DebtType,
} from '../domain/debt';
import { KeyboardAwareSheet } from './KeyboardAwareSheet';
import { maskedMoney as money } from './useMoney';
import { currencySymbol } from '../domain/_shared/money';
import { assetClassOf } from '../domain/assets';

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

// EMPTY MEANS EMPTY (2026-10-31, the lead's ruling R16; drawing match round 3, NW3-07): a box nobody filled opens empty — no grey '0', '$0',
// '6.5', '19.99' or '0%' that reads as an answer, and a date box says 'mm/yyyy', not '03/2047' (which sat above "paid off by April 2049").
// THE DUE DAY'S RANGE IS IN ITS LABEL, 'Due day (1–31)', not grey in the empty box (R16; NW4-05, 2026-11-01; debt editor v03 row 10)
export function DebtEditorSheet({ state, onClose }: { state: { open: boolean; edit?: Debt }; onClose: () => void }) {
  const store = useStore() as any;
  const editing = state.edit;
  const fromSetup = editing != null && editing.setup_loan != null && String(editing.debt_id).startsWith('setup-loan-');   // a setup loan's row (R22)
  const [kind, setKind] = useState<DebtType>('CREDIT_CARD'); const [inst, setInst] = useState('');
  const [bal, setBal] = useState(''); const [apr, setApr] = useState(''); const [pay, setPay] = useState('');
  const [due, setDue] = useState(''); const [monthly, setMonthly] = useState('');
  const [shape, setShape] = useState<NonNullable<Debt['payment_type']>>('revolving');
  const [shapeTouched, setShapeTouched] = useState(false);   // user override survives kind changes
  const [endBy, setEndBy] = useState('');                    // installment: "paid off by" (MM/YYYY)
  const [dueDate, setDueDate] = useState('');                // due_in_full: the lump's date
  const [startsOn, setStartsOn] = useState('');              // installment: payments START here (deferred loans)
  const [drives, setDrives] = useState<'payment' | 'date'>('payment');   // which field the user entered last
  // HIS RULE, 2026-10-04 (DEC-1925): "no mortgage without property". A mortgage says which property in
  // Net worth it is on, and cannot be saved without one. A property that already carries another
  // mortgage is not offered: one mortgage to a property.
  const [propertyId, setPropertyId] = useState<string>('');
  const allDebts = ((store as any).liabilities ?? []) as Debt[];
  const everyProperty = (((store as any).assetAccounts ?? []) as any[]).filter((a) => assetClassOf(a) === 'real_estate');
  const properties = everyProperty
    .filter((a) => !allDebts.some((d) => d.debt_type === 'MORTGAGE' && d !== editing && d.debt_id !== editing?.debt_id && String(d.property_id ?? '') === String(a.asset_id)));

  useEffect(() => {
    if (!state.open) return;
    const k = (editing?.debt_type as DebtType) ?? 'CREDIT_CARD';
    setKind(k); setInst(editing?.institution ?? '');
    setBal(editing ? String(editing.remaining_balance) : ''); setApr(editing && !rateNotEntered(editing) ? String(editing.interest_rate_apr * 100) : '');   // a rate never entered opens empty, never "NaN" (2026-10-25)
    // a payment never entered opens as an empty box, never the word "undefined" (2026-10-21)
    setPay(editing && editing.minimum_monthly_payment != null ? String(editing.minimum_monthly_payment) : '');
    setDue(editing?.due_day ? String(editing.due_day) : ''); setMonthly(editing?.monthly_payment ? String(editing.monthly_payment) : '');
    setShape(editing?.payment_type ?? defaultPaymentType(k)); setShapeTouched(!!editing?.payment_type);
    const pm = editing?.payoff_date?.match(/^(\d{4})-(\d{2})/);
    setEndBy(pm ? `${pm[2]}/${pm[1]}` : ''); setDueDate(pm ? `${pm[2]}/${pm[1]}` : '');
    const fp = editing?.first_payment_date?.match(/^(\d{4})-(\d{2})/);
    setStartsOn(fp ? `${fp[2]}/${fp[1]}` : '');
    setDrives('payment');
    setPropertyId(editing?.property_id != null ? String(editing.property_id) : '');
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
      if (months == null) derivedLine = `⚠ ${money(payIn)}/month doesn’t cover the interest — this never pays off`;
      else { calcPayoffIso = isoInMonths(months, now); derivedLine = `✓ paid off by ${fmtMonthYear(calcPayoffIso)} — computed from your balance, rate and payment`; }
    } else if (drives === 'date' && endIso) {
      const months = Math.max(1, monthsFromNow(endIso, now));
      calcPayment = paymentToClearBy(amt, aprDec, months);
      derivedLine = `✓ that takes ${money(calcPayment)}/month — computed from your balance, rate and end date`;
    }
  }

  // revolving: the approved mock's "✓ clear in 17 months at $400/month" line (you-pay, else the minimum)
  const cardPay = num(monthly) || num(pay);
  const cardMonths = shape === 'revolving' && amt > 0 && cardPay > 0 ? monthsToClear(amt, aprDec, cardPay) : null;

  const dueIso = parseMonthYear(dueDate);
  const startIso = parseMonthYear(startsOn);
  const monthsToDue = dueIso ? Math.max(0, monthsFromNow(dueIso, now)) : null;
  const onAProperty = kind === 'MORTGAGE' || kind === 'HELOC';
  const ready = amt > 0 && (shape !== 'due_in_full' || !!dueIso) && (kind !== 'MORTGAGE' || propertyId !== '');

  const save = () => {
    if (!ready) return;
    const label = inst.trim() || debtKind(kind)?.label || 'Debt';
    const dd = Math.min(31, Math.max(0, Math.round(num(due)))) || undefined;
    // A RATE LEFT BLANK IS NOT 0% (2026-10-25, FIX-MONTH; tenet 3): it is saved as not entered and every screen says "rate not entered"; a typed 0 is 0%
    const base = { label, institution: inst.trim(), debt_type: kind, remaining_balance: amt, interest_rate_apr: apr.trim() === '' ? (undefined as any) : aprDec, payment_type: shape,
      property_id: onAProperty && propertyId !== '' ? propertyId : undefined };
    // A PAYMENT LEFT BLANK IS NOT $0 (2026-10-21, DEC-3523 tenet 3): it is saved as not entered, so Net worth and the
    // emergency fund name the debt instead of counting $0 for it. A typed 0 is 0; a payment calculated from an end date is a
    // payment. It was saved as $0, which read as a debt that costs nothing a month.
    const payTyped = pay.trim() !== '' || monthly.trim() !== '';
    const installmentKnown = payTyped || (drives === 'date' && !!endIso && amt > 0);
    const patch =
      shape === 'due_in_full'
        // a lump has NO monthly payment — it lands as a dated big-ticket in cash flow instead
        ? { ...base, minimum_monthly_payment: 0, monthly_payment: undefined, due_day: undefined, payoff_date: dueIso }
        : shape === 'installment'
          // the real payment IS the obligation (there's no separate "minimum" on a mortgage)
          ? { ...base, minimum_monthly_payment: installmentKnown ? calcPayment : undefined, monthly_payment: installmentKnown ? calcPayment : undefined, due_day: dd, payoff_date: calcPayoffIso, first_payment_date: startIso }
          : { ...base, minimum_monthly_payment: pay.trim() === '' ? undefined : num(pay), monthly_payment: monthly.trim() === '' ? undefined : (num(monthly) || num(pay)), due_day: dd, payoff_date: undefined };
    // a student loan from setup is not a saved debt yet: saving its row saves it as one, marked as that loan, so it is counted once (R22)
    if (fromSetup) store.addLiability?.({ ...patch, setup_loan: editing!.setup_loan });
    else if (editing) store.updateLiability?.(editing.debt_id, patch); else store.addLiability?.(patch);
    onClose();
  };
  // walk row 23: same confirm rule for debts — a deleted debt RAISES net worth silently otherwise.
  const remove = () => {
    if (!editing) { onClose(); return; }
    Alert.alert(
      `Remove ${editing.label}?`,
      `Its ${money(Math.round(editing.remaining_balance || 0))} debt comes off your list. This can’t be undone.`,
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
      {onAProperty && (
        <>
          <Text style={sh.lbl}>Which property is it on?</Text>
          {properties.length === 0 ? (
            /* HIS WORDS, 2026-10-05: "display the message when they try to enter mortgage on debt screen - add
               property first on NW page." It shows the moment Mortgage is picked, in the warning colour. */
            <Text style={[sh.lbl, { color: Colors.amber }]} accessibilityRole="alert">{kind !== 'MORTGAGE'
              ? 'No property in Net worth yet.'
              : everyProperty.length === 0
                ? 'Add the property first, on the Net worth page. A mortgage is always on a property, so this one cannot be saved until its property is there.'
                : 'Every property in Net worth already has a mortgage. Add the property this one is on first, on the Net worth page.'}</Text>
          ) : (
            <View style={sh.chips}>
              {properties.map((a) => (
                <TouchableOpacity key={String(a.asset_id)} style={[sh.chip, propertyId === String(a.asset_id) && sh.chipOn]} accessibilityRole="button"
                  accessibilityState={{ selected: propertyId === String(a.asset_id) }} accessibilityLabel={`On ${a.label}`} onPress={() => setPropertyId(String(a.asset_id))}>
                  <Text style={sh.chipTxt}>🏠 {a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {kind === 'MORTGAGE' && properties.length > 0 && propertyId === '' && (
            <Text style={[sh.lbl, { color: Colors.amber }]}>Pick the property this mortgage is on to save it.</Text>
          )}
        </>
      )}
      <View style={sh.amtRow}><Text style={sh.amtPre}>{currencySymbol()}</Text><MoneyBox bare dollarBeside a11y="Balance" style={sh.amtIn} value={bal} onChangeText={setBal} /></View>

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
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due date (month/year)</Text><TextInput style={sh.input} accessibilityLabel="Due date, month and year" keyboardType="numbers-and-punctuation" placeholder="mm/yyyy" placeholderTextColor={Colors.textTertiary} value={dueDate} onChangeText={setDueDate} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate % (optional)</Text><TextInput style={sh.input} accessibilityLabel="Interest rate percent, optional" keyboardType="decimal-pad" value={apr} onChangeText={setApr} /></View>
        </View>
        {amt > 0 && dueIso
          ? <Text style={sh.derived}>✓ lands as a {money(amt)} big-ticket in {fmtMonthYear(dueIso)}’s cash flow and on the bill calendar{monthsToDue != null && monthsToDue > 0 ? ` — ${plural(monthsToDue, 'month')} of warning` : ''}, not a surprise</Text>
          : <Text style={sh.derivedMuted}>Enter the amount and its due date — no monthly payment to track.</Text>}
      </>) : shape === 'installment' ? (<>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate %</Text><TextInput style={sh.input} accessibilityLabel="Interest rate percent" keyboardType="decimal-pad" value={apr} onChangeText={setApr} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due day (1–31)</Text><TextInput style={sh.input} accessibilityLabel="Due day" keyboardType="number-pad" value={due} onChangeText={setDue} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Monthly payment (what you pay)</Text><MoneyBox bare a11y="Monthly payment, what you pay" style={sh.input} value={monthly} onChangeText={(t) => { setMonthly(t); setDrives('payment'); }} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Or: paid off by</Text><TextInput style={sh.input} accessibilityLabel="Or paid off by, month and year" keyboardType="numbers-and-punctuation" placeholder="mm/yyyy" placeholderTextColor={Colors.textTertiary} value={endBy} onChangeText={(t) => { setEndBy(t); setDrives('date'); }} /></View>
        </View>
        {derivedLine
          ? <Text style={derivedLine.startsWith('⚠') ? sh.derivedWarn : sh.derived}>{derivedLine}</Text>
          : <Text style={sh.derivedMuted}>Enter either one — the other is computed from your balance and rate.</Text>}
        <Text style={sh.lbl}>Payments start (month/year — only for loans that haven’t started yet)</Text>
        <TextInput style={sh.input} keyboardType="numbers-and-punctuation" placeholder="already paying" placeholderTextColor={Colors.textTertiary} value={startsOn} onChangeText={setStartsOn} />
      </>) : (<>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Interest rate %</Text><TextInput style={sh.input} accessibilityLabel="Interest rate percent" keyboardType="decimal-pad" value={apr} onChangeText={setApr} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Due day (1–31)</Text><TextInput style={sh.input} accessibilityLabel="Due day" keyboardType="number-pad" value={due} onChangeText={setDue} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>Min payment /month</Text><MoneyBox bare a11y="Minimum payment a month" style={sh.input} value={pay} onChangeText={setPay} /></View>
          <View style={{ flex: 1 }}><Text style={sh.lbl}>You pay /month</Text><MoneyBox bare a11y="You pay a month" style={sh.input} placeholder="≥ min" value={monthly} onChangeText={setMonthly} /></View>
        </View>
        {cardMonths != null
          ? <Text style={sh.derived}>✓ clear in {plural(cardMonths, 'month')} at {money(cardPay)}/month</Text>
          : cardPay > 0 && amt > 0
            ? <Text style={sh.derivedWarn}>⚠ {money(cardPay)}/month doesn’t cover the interest — this never pays off</Text>
            : null}
      </>)}

      <TouchableOpacity style={[sh.save, !ready && { opacity: 0.4 }]} disabled={!ready} accessibilityRole="button" accessibilityLabel={editing ? 'Save debt' : 'Add debt'} onPress={save}><Text style={sh.saveTxt}>{editing ? 'Save' : 'Add'} {shape === 'revolving' ? 'card' : shape === 'due_in_full' ? 'loan' : (debtKind(kind)?.label.toLowerCase() ?? 'debt')}</Text></TouchableOpacity>
      {editing && !fromSetup && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove debt" style={{ minHeight: 44, justifyContent: 'center' }} onPress={remove}><Text style={sh.remove}>Remove</Text></TouchableOpacity>}
    </KeyboardAwareSheet>
  );
}

const sh = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  // rounded corners, not semicircle ends — the one shape of a choice (DEC-0231, 2026-09-25; corrected 2026-10-20)
  // every choice at least 44 tall, the smallest finger target (DEC-0141): measured drawing the debt editor v02 (2026-10-27), the kinds were 43
  chip: { paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  input: { backgroundColor: Colors.cardBg, borderRadius: Radii.md, padding: Spacing.md, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.sm },
  lbl: { fontSize: 13, color: Colors.textSecondary, marginTop: Spacing.sm, marginBottom: 2 },
  amtRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  amtPre: { fontSize: 24, fontWeight: '800', color: Colors.textSecondary },
  amtIn: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, minWidth: 80, textAlign: 'center', padding: 0 },
  segRow: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardBg, paddingHorizontal: 4 },
  segOn: { borderColor: Colors.textPrimary, backgroundColor: Colors.textPrimary },
  segTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  segTxtOn: { color: Colors.cardBg },
  derived: { fontSize: 13, color: Colors.gainText, fontWeight: '600', marginTop: Spacing.sm },
  derivedWarn: { fontSize: 13, color: Colors.red, fontWeight: '600', marginTop: Spacing.sm },
  derivedMuted: { fontSize: 13, color: Colors.textTertiary, marginTop: Spacing.sm },
  save: { backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  saveTxt: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  remove: { color: Colors.red, fontWeight: '700', textAlign: 'center', paddingVertical: Spacing.md },
});

