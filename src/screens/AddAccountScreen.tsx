// Add or edit an account by hand — ONE dynamic screen (FCC detailed design v1.1, Net worth
// r71-r76, closing M1 + c15/c16): pick what it is, only that class's fields appear, required
// ones gate the Save. Edit mode is this same screen pre-filled (the 'manual update' view) —
// saving writes the balance AND stamps value-as-of together, the same staleness concept bonds
// and alternatives use. Writes through the SAME store actions every editor uses — one write path.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScreen } from '../components/KeyboardAwareScreen';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { maskedMoney } from '../components/useMoney';
import { InfoDot } from '../components/UI';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// native date picker (audit AA-1: no hand-typed YYYY-MM-DD) — same helpers the Bonds editor uses
const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s: string) => { const [y, m, dd] = (s || '').split('-').map(Number); return y ? new Date(y, (m || 1) - 1, dd || 1) : new Date(); };
const humanDate = (s: string) => (s ? parseISO(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');

type Cls = 'cash' | 'stocks' | 'bonds' | 'alts' | 'property' | 'debt';
const CLASSES: { id: Cls; label: string }[] = [
  { id: 'cash', label: 'Cash' }, { id: 'stocks', label: 'Stocks & funds' },
  { id: 'bonds', label: 'Bonds' }, { id: 'alts', label: 'Alternatives' },
  { id: 'property', label: 'Real estate' }, { id: 'debt', label: 'Debt' },
];
const KIND_BY_CLASS: Record<Exclude<Cls, 'debt'>, string> = { cash: 'checking', stocks: 'brokerage', bonds: 'fixed_income', alts: 'other_asset', property: 'real_estate' };
const ALT_TYPES = [['crypto', 'Crypto'], ['commodities', 'Gold / commodities'], ['private_equity', 'Private stake'], ['annuities', 'Annuity'], ['other_asset', 'Other']] as const;
const WRAPPERS = [['TAXABLE', 'Taxable'], ['PRE_TAX', '401(k) / IRA'], ['ROTH', 'Roth']] as const;

const classOfExisting = (a: any): Cls => {
  if (!a) return 'cash';
  if (a.tax_bucket === 'CASH') return 'cash';
  if (a.tax_bucket === 'PROPERTY') return 'property';
  if (a.asset_class === 'bonds' || a.kind === 'fixed_income') return 'bonds';
  if (a.asset_class === 'alternatives' || ['crypto', 'commodities', 'private_equity', 'annuities'].includes(a.kind)) return 'alts';
  return 'stocks';
};

export default function AddAccountScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const store = useStore() as any;
  const existing = useMemo(() => (store.assetAccounts ?? []).find((a: any) => a.asset_id === String(params.edit)), [params.edit, store.assetAccounts]);
  const editMode = !!existing;

  const [cls, setCls] = useState<Cls>(() => classOfExisting(existing));
  const [name, setName] = useState<string>(existing?.label ?? '');
  const [institution, setInstitution] = useState<string>(existing?.institution ?? '');
  const [balance, setBalance] = useState<string>(existing?.balance != null && editMode ? String(Math.round(existing.balance)) : '');
  const [rate, setRate] = useState<string>('');
  const [wrapper, setWrapper] = useState<string>(existing?.tax_bucket && existing.tax_bucket !== 'CASH' && existing.tax_bucket !== 'PROPERTY' ? existing.tax_bucket : 'TAXABLE');
  const [earmark, setEarmark] = useState<string>(existing?.retirement_pct != null ? String(existing.retirement_pct) : '');
  const [altType, setAltType] = useState<string>(existing?.kind && ALT_TYPES.some(([k]) => k === existing.kind) ? existing.kind : 'crypto');
  const [owe, setOwe] = useState<string>('');
  // bond fields
  const [face, setFace] = useState<string>(existing?.face_value != null ? String(existing.face_value) : '');
  const [coupon, setCoupon] = useState<string>(existing?.coupon_rate != null ? String(existing.coupon_rate * 100) : '');
  const [maturity, setMaturity] = useState<string>(existing?.maturity_date ?? '');
  const [showMaturity, setShowMaturity] = useState(false);
  // debt fields
  const [apr, setApr] = useState<string>('');
  const [minPay, setMinPay] = useState<string>('');

  const isInvestment = cls === 'stocks' || cls === 'bonds' || cls === 'alts';
  const ready = cls === 'debt'
    ? name.trim() !== '' && num(balance) > 0 && minPay.trim() !== ''
    : name.trim() !== '' && balance.trim() !== '';           // an explicit $0 is allowed (B-21 rule)

  const save = () => {
    if (!ready) return;
    const today = new Date().toISOString().slice(0, 10);
    if (cls === 'debt') {
      store.addLiability?.({ label: name.trim(), debt_type: 'OTHER', remaining_balance: num(balance), interest_rate_apr: num(apr) / 100, minimum_monthly_payment: num(minPay) });
      router.back();
      return;
    }
    const base: any = {
      label: name.trim(), institution: institution.trim() || undefined,
      balance: num(balance), value_as_of: today, source: 'manual' as const,
      kind: cls === 'alts' ? altType : KIND_BY_CLASS[cls],
      tax_bucket: cls === 'cash' ? 'CASH' : cls === 'property' ? 'PROPERTY' : wrapper,
    };
    if (cls === 'bonds') { base.asset_class = 'bonds'; base.face_value = num(face) || undefined; base.coupon_rate = num(coupon) > 0 ? num(coupon) / 100 : undefined; base.maturity_date = maturity.trim() || undefined; }
    if (cls === 'alts') base.asset_class = 'alternatives';
    if (isInvestment && earmark.trim() !== '') base.retirement_pct = Math.max(0, Math.min(100, num(earmark)));
    if (cls === 'cash' && num(rate) > 0) base.target_return = num(rate) / 100;
    if (editMode) store.updateAsset?.(existing.asset_id, base);
    else store.addAsset?.(base);
    // real estate can carry what-you-owe: one honest mortgage row, not a hidden net
    if (cls === 'property' && num(owe) > 0 && !editMode) {
      store.addLiability?.({ label: `${name.trim()} mortgage`, debt_type: 'MORTGAGE', remaining_balance: num(owe), interest_rate_apr: 0, minimum_monthly_payment: 0 });
    }
    router.back();
  };

  const remove = () => Alert.alert('Delete this account?', `${existing.label} and its settings will be removed.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => { store.deleteAsset?.(existing.asset_id); router.back(); } },
  ]);

  const field = (label: string, value: string, set: (t: string) => void, opts: { placeholder?: string; keyboard?: any; required?: boolean; a11y?: string } = {}) => (
    <View>
      <Text style={s.fieldL}>{label}{opts.required ? ' *' : ''}</Text>
      <TextInput style={s.input} value={value} onChangeText={set} placeholder={opts.placeholder}
        placeholderTextColor={Colors.textTertiary} keyboardType={opts.keyboard}
        accessibilityLabel={opts.a11y ?? label} />
    </View>
  );

  return (
    <KeyboardAwareScreen style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} accessibilityLabel="Back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.backBtn}>
        <Text style={s.back}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={s.h1}>{editMode ? `Update ${existing.label}` : 'Add an account'}</Text>
      {editMode && <Text style={s.sub}>Saving updates the balance and stamps today as its value date.</Text>}

      {!editMode && (
        <>
          <Text style={s.q}>What is it? *</Text>
          <View style={s.chipWrap}>
            {CLASSES.map((c) => (
              <TouchableOpacity accessibilityRole="radio" key={c.id} style={[s.chip, cls === c.id && s.chipOn]}
                onPress={() => setCls(c.id)} accessibilityState={{ selected: cls === c.id }} accessibilityLabel={c.label}>
                <Text style={[s.chipTxt, cls === c.id && { color: Colors.primaryDark }]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {field('Name', name, setName, { placeholder: cls === 'debt' ? 'Car loan' : 'Chase checking', required: true, a11y: 'Account name' })}
      {cls !== 'debt' && cls !== 'property' && field('Institution (optional)', institution, setInstitution, { placeholder: 'Chase', a11y: 'Institution' })}
      {field(cls === 'debt' ? 'Amount you owe' : cls === 'property' ? 'What it’s worth' : 'Balance', balance, setBalance, { placeholder: '$0', keyboard: 'decimal-pad', required: true, a11y: 'Balance' })}
      {cls === 'cash' && field('Interest rate % (optional)', rate, setRate, { placeholder: '0.0', keyboard: 'decimal-pad', a11y: 'Interest rate percent' })}

      {cls === 'bonds' && (
        <>
          {field('Face value (optional)', face, setFace, { placeholder: '$10,000', keyboard: 'decimal-pad', a11y: 'Face value' })}
          {field('Interest rate % (optional)', coupon, setCoupon, { placeholder: '4.5', keyboard: 'decimal-pad', a11y: 'Coupon percent' })}
          <Text style={s.fieldL}>Matures (optional)</Text>
          <TouchableOpacity accessibilityRole="button" style={s.input} activeOpacity={0.7}
            accessibilityLabel={maturity ? `Maturity date, ${humanDate(maturity)}. Tap to change.` : 'Pick a maturity date'}
            onPress={() => { if (!showMaturity && !maturity) setMaturity(fmtISO(new Date(new Date().getFullYear() + 10, 0, 1))); setShowMaturity((v) => !v); }}>
            <Text style={{ fontSize: 16, color: maturity ? Colors.textPrimary : Colors.textTertiary }}>{maturity ? humanDate(maturity) : 'Tap to pick a date'}</Text>
          </TouchableOpacity>
          {showMaturity && (
            <DateTimePicker value={maturity ? parseISO(maturity) : new Date(new Date().getFullYear() + 10, 0, 1)} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date(2000, 0, 1)}
              onChange={(e: any, d?: Date) => {
                if (Platform.OS !== 'ios') setShowMaturity(false);
                if (e?.type === 'dismissed') return;
                if (d) setMaturity(fmtISO(d));
              }} />
          )}
        </>
      )}

      {cls === 'alts' && (
        <>
          <Text style={s.fieldL}>What kind?</Text>
          <View style={s.chipWrap}>
            {ALT_TYPES.map(([k, label]) => (
              <TouchableOpacity accessibilityRole="radio" key={k} style={[s.chip, altType === k && s.chipOn]}
                onPress={() => setAltType(k)} accessibilityState={{ selected: altType === k }} accessibilityLabel={label}>
                <Text style={[s.chipTxt, altType === k && { color: Colors.primaryDark }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {cls === 'property' && !editMode && field('Still owed on it (optional)', owe, setOwe, { placeholder: '$0', keyboard: 'decimal-pad', a11y: 'Amount still owed' })}
      {cls === 'debt' && (
        <>
          {field('Interest rate % *', apr, setApr, { placeholder: '7.0', keyboard: 'decimal-pad', a11y: 'Interest rate percent' })}
          {field('Minimum monthly payment *', minPay, setMinPay, { placeholder: '$150', keyboard: 'decimal-pad', required: false, a11y: 'Minimum monthly payment' })}
        </>
      )}

      {isInvestment && (
        <>
          <Text style={s.fieldL}>Held in</Text>
          <View style={s.chipWrap}>
            {WRAPPERS.map(([v, label]) => (
              <TouchableOpacity accessibilityRole="radio" key={v} style={[s.chip, wrapper === v && s.chipOn]}
                onPress={() => setWrapper(v)} accessibilityState={{ selected: wrapper === v }} accessibilityLabel={`Held in ${label}`}>
                <Text style={[s.chipTxt, wrapper === v && { color: Colors.primaryDark }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.fieldL}>Retirement earmark % (optional)</Text>
            <InfoDot term="earmarked" />
          </View>
          <TextInput style={s.input} value={earmark} onChangeText={setEarmark} placeholder="100"
            placeholderTextColor={Colors.textTertiary} keyboardType="number-pad" accessibilityLabel="Retirement earmark percent" />
        </>
      )}

      <Text style={s.asOf}>value as of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>

      <TouchableOpacity accessibilityRole="button" style={[s.primaryBtn, !ready && { opacity: 0.4 }]} disabled={!ready} onPress={save}
        accessibilityLabel={editMode ? 'Save the update' : 'Save this account'}>
        <Text style={s.primaryTxt}>Save{editMode ? '' : balance.trim() !== '' ? ` ${maskedMoney(num(balance))}` : ''}</Text>
      </TouchableOpacity>
      {editMode && (
        <TouchableOpacity accessibilityRole="button" style={s.deleteBtn} onPress={remove} accessibilityLabel={`Delete ${existing.label}`}>
          <Text style={s.deleteTxt}>Delete this account</Text>
        </TouchableOpacity>
      )}
      <View style={{ height: 40 }} />
    </KeyboardAwareScreen>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgSecondary },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  backBtn: { alignSelf: 'flex-start', marginBottom: 6 },
  back: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 19 },
  q: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, paddingVertical: 9, paddingHorizontal: 12, minHeight: 42, justifyContent: 'center', backgroundColor: Colors.cardBg },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipTxt: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  fieldL: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md, marginBottom: 5 },
  input: { backgroundColor: Colors.cardBg, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  asOf: { fontSize: 12.5, color: Colors.textTertiary, marginTop: Spacing.md },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.lg, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  primaryTxt: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  deleteBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  deleteTxt: { fontSize: 14, fontWeight: '700', color: Colors.red },
});
