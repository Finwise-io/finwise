// Bonds — individual bond management (Phase B). Bonds are AssetAccounts with bond fields, so they
// already flow into Net Worth + the nest egg; here we add/edit them and show bond-specific metrics.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, Platform, Alert, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { InfoDot } from '../components/UI';
import { DateField } from '../components/DateField';
import { type AssetAccount, type TaxBucket } from '../domain/assets';
import { isBond, bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary } from '../domain/bonds';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
// ISO date helpers (local components, no TZ shift) for the maturity date picker
const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s: string) => { const [y, m, dd] = (s || '').split('-').map(Number); return y ? new Date(y, (m || 1) - 1, dd || 1) : new Date(); };
const humanDate = (s: string) => (s ? parseISO(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '');
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
const ACCT_TYPES: { label: string; bucket: TaxBucket }[] = [
  { label: 'Taxable', bucket: 'TAXABLE' }, { label: 'Trad IRA / 401k', bucket: 'PRE_TAX' }, { label: 'Roth', bucket: 'ROTH' },
];

export default function BondsScreen() {
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const bonds = useMemo(() => {
    // NW-14: show soonest-maturing first (matured / no-maturity sink to the bottom).
    const sortKey = (a: AssetAccount) => {
      const m = bondInfo(a).maturity;
      const t = m ? parseISO(m).getTime() : NaN;
      return isNaN(t) ? Infinity : t;
    };
    return accounts.filter(isBond).slice().sort((a, b) => sortKey(a) - sortKey(b));
  }, [accounts]);
  const summary = useMemo(() => bondSummary(bonds.map(bondInfo)), [bonds]);
  const [edit, setEdit] = useState<AssetAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.h1}>Bonds</Text><InfoDot term="bonds" /></View>

      {bonds.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>Track individual bonds — Treasuries, muni or corporate bonds, bond funds/ETFs — with their coupon income, maturity, and yield. They count toward your net worth and retirement nest egg.</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.addBtn} onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add a bond</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.sumVal}>{money(summary.totalValue)}</Text>
            <Text style={styles.sumLab}>{summary.count} bond{summary.count > 1 ? 's' : ''} · face {money(summary.totalFace)}</Text>
            <View style={styles.sumRow}>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>COUPON / YR</Text><Text style={[styles.sumCellV, { color: Colors.primary }]}>{money(summary.annualCoupon)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>AVG YIELD</Text><Text style={styles.sumCellV}>{pct(summary.avgYield)}</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>NEXT MATURITY</Text><Text style={styles.sumCellV}>{summary.nextMaturity ? new Date(summary.nextMaturity).getFullYear() : '—'}</Text></View>
            </View>
          </View>

          {bonds.map((a) => {
            const bi = bondInfo(a);
            const yrs = yearsToMaturity(bi.maturity);
            return (
              <TouchableOpacity key={a.asset_id} accessibilityRole="button" accessibilityLabel={`${a.institution?.trim() || a.label}, ${money(a.balance || 0)}, matures ${humanDate(bi.maturity)}`} style={styles.card} onPress={() => setEdit(a)}>
                <View style={styles.bondHead}><Text style={styles.bondName} numberOfLines={1}>{a.institution?.trim() || a.label}</Text><Text style={styles.bondVal}>{money(a.balance || 0)}</Text></View>
                <Text style={styles.bondSub} numberOfLines={2}>face {money(bi.face)} · {(bi.couponRate * 100).toFixed(2)}% coupon · matures {humanDate(bi.maturity)}{yrs > 0 ? ` (${yrs.toFixed(1)}y)` : ' (matured)'}</Text>
                <View style={styles.bondMetrics}>
                  <Text style={styles.metric}>{money(annualCoupon(bi))}/yr coupon</Text>
                  <Text style={styles.metric}>yield {pct(currentYield(bi))}</Text>
                  <Text style={styles.metric}>Yield to maturity: {pct(approxYTM(bi))}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add a bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add a bond</Text></TouchableOpacity>
          <Text style={styles.foot}>Coupons are paid as cash and counted as investment income. Value is what you enter (held at cost/quote — no live bond pricing). Yield to maturity is an estimate.</Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <BondEditor bond={addOpen ? null : edit} open={addOpen || edit != null} onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(fields) => {
          if (edit) { store.updateAsset(edit.asset_id, fields); setAddOpen(false); setEdit(null); return; }
          const bondValue = Number(fields.balance) || 0;
          const addIt = () => { store.addAsset({ kind: 'fixed_income', target_return: fields.coupon_rate ?? 0.04, ...fields }); setAddOpen(false); setEdit(null); };
          // double-count guard: a non-bond account at the same institution may already include this bond
          const inst = String(fields.institution ?? '').trim().toLowerCase();
          const dup = inst ? accounts.find((a) => !isBond(a) && String(a.institution ?? '').trim().toLowerCase() === inst && (a.balance || 0) > 0) : null;
          if (dup) {
            // "Part of it" = nest the bond inside the existing balance (lower that account so the total holds)
            const addAsPartOf = () => { store.updateAsset(dup.asset_id, { balance: Math.max(0, (dup.balance || 0) - bondValue) }); addIt(); };
            Alert.alert(
              'Part of an existing account?',
              `${dup.institution}'s “${dup.label}” is worth ${money(dup.balance || 0)}. Is this ${money(bondValue)} bond part of that, or additional money?\n\n“Part of it” lowers ${dup.label} by ${money(bondValue)} so nothing is double-counted (total stays ${money(dup.balance || 0)}).`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Additional money', onPress: addIt },
                { text: 'Part of it', onPress: addAsPartOf },
              ],
            );
          } else { addIt(); }
        }}
        onDelete={edit ? () => { store.deleteAsset(edit.asset_id); setEdit(null); } : undefined} />
    </ScrollView>
  );
}

export function BondEditor({ bond, open, onClose, onSave, onDelete }: {
  bond: AssetAccount | null; open: boolean; onClose: () => void; onSave: (f: Partial<AssetAccount>) => void; onDelete?: () => void;
}) {
  const [label, setLabel] = useState('');
  const [face, setFace] = useState('');
  const [coupon, setCoupon] = useState('');
  const [maturity, setMaturity] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [value, setValue] = useState('');
  const [valueAsOf, setValueAsOf] = useState('');   // walk row 4: the stamp lives everywhere a manual value does
  const [institution, setInstitution] = useState('');
  const [bucket, setBucket] = useState<TaxBucket>('TAXABLE');
  const [sellAmt, setSellAmt] = useState('');
  React.useEffect(() => {
    if (!open) return;
    setLabel(bond?.label ?? ''); setFace(bond?.face_value ? String(bond.face_value) : '');
    setCoupon(bond?.coupon_rate ? String(bond.coupon_rate * 100) : ''); setMaturity(bond?.maturity_date ?? '');
    setValue(bond ? String(bond.balance ?? '') : ''); setBucket(bond?.tax_bucket ?? 'TAXABLE'); setInstitution(bond?.institution ?? ''); setSellAmt(''); setValueAsOf(bond?.value_as_of ?? '');
  }, [open]);
  // You can sell a bond on the secondary market before maturity. Record a full or partial sale: a full
  // sale closes the position; a partial sale lowers its value and scales the face/par proportionally.
  // Walk row 4 (audit Home·NW #20): the sale goes through the LEDGER — a SELL row appears in the
  // account's Activity exactly like stock sales, instead of a silent balance patch with no trail.
  const recordTransaction = useStore((s: any) => s.recordTransaction);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const applySale = () => {
    const sold = num(sellAmt); if (sold <= 0) return;
    const cur = num(value) > 0 ? num(value) : num(face);
    if (cur <= 0) return;
    const full = sold >= cur - 0.005;
    Alert.alert(
      full ? 'Close this bond?' : 'Record a sale?',
      full
        ? `Marks the whole position (${money(cur)}) as sold and removes it from your holdings.`
        : `Lowers ${label.trim() || 'this bond'} from ${money(cur)} to ${money(cur - sold)} (face value adjusts proportionally). Coupons are paid on the remaining face — and the sale shows in this account's activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: full ? 'Close position' : 'Record sale', onPress: () => {
          if (full) { onDelete?.(); return; }
          const newVal = r2(cur - sold);
          // the ledger row lowers the value (the one writer); onSave carries only the non-balance fields
          if (bond) recordTransaction?.({ type: 'SELL', account_id: bond.asset_id, amount: sold, date: new Date().toISOString().slice(0, 10), note: 'Bond sale' });
          onSave({ label: label.trim(), tax_bucket: bucket, institution: institution.trim() || undefined,
            coupon_rate: num(coupon) / 100, maturity_date: maturity.trim(),
            face_value: r2(num(face) * (newVal / cur)), ...(bond ? {} : { balance: newVal }) });
        } },
      ],
    );
  };
  const valid = label.trim() && num(face) > 0 && num(coupon) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(maturity.trim());
  // #11: the spinner only fires onChange when you SPIN it, so tapping "Done" on the default date saved
  // nothing. Commit the default the instant the picker opens, so the shown date is the chosen date.
  const defaultMaturityISO = fmtISO(new Date(new Date().getFullYear() + 10, 0, 1));
  const openPicker = () => {
    if (!showPicker && !maturity) setMaturity(defaultMaturityISO);
    setShowPicker((s) => !s);
  };
  const save = () => onSave({
    label: label.trim(), tax_bucket: bucket, institution: institution.trim() || undefined,
    face_value: num(face), coupon_rate: num(coupon) / 100, maturity_date: maturity.trim(),
    balance: num(value) > 0 ? num(value) : num(face),   // default value to face if blank
    value_as_of: valueAsOf || fmtISO(new Date()),       // walk row 4: every manual value carries its date
  });
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%' }}>
          <Text style={styles.sheetT}>{bond ? 'Edit bond' : 'Add a bond'}</Text>
          <Text style={styles.fieldL}>Name / issuer</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. US Treasury 2030, Apple Corp 4.5%" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Institution / account (optional)</Text>
          <TextInput style={styles.input} value={institution} onChangeText={setInstitution} placeholder="e.g. Chase, Fidelity, Schwab" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldHint}>Held inside a brokerage or bank account? Add it here — if that account already has a balance, we'll ask whether this bond is part of it so nothing is double-counted.</Text>
          <Text style={styles.fieldL}>Face (par) value</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={face} onChangeText={setFace} placeholder="10000" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Coupon rate (% per year)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={coupon} onChangeText={setCoupon} placeholder="4.5" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Maturity date</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={maturity ? `Maturity date, ${humanDate(maturity)}. Tap to change.` : 'Pick a maturity date'} style={styles.input} activeOpacity={0.7} onPress={openPicker}>
            <Text style={{ fontSize: 16, color: maturity ? Colors.textPrimary : Colors.textTertiary }}>{maturity ? humanDate(maturity) : 'Tap to pick a date'}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={maturity ? parseISO(maturity) : new Date(new Date().getFullYear() + 10, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date(2000, 0, 1)}
              onChange={(e: any, d?: Date) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (e?.type === 'dismissed') return;
                if (d) setMaturity(fmtISO(d));
              }}
            />
          )}
          {showPicker && Platform.OS === 'ios' && (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Done picking date" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setShowPicker(false)} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}>
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 15 }}>Done</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.fieldL}>Current value (blank = face value)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={setValue} placeholder="what it's worth now" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Value as of</Text>
          <DateField value={valueAsOf} onChange={setValueAsOf} label="value as of" style={styles.input} />
          {valid && num(face) > 0 && <Text style={styles.note}>~{money(num(face) * (num(coupon) / 100))}/yr in coupon income.</Text>}
          <Text style={styles.fieldL}>Account</Text>
          <View style={styles.chips}>{ACCT_TYPES.map((t) => (
            <TouchableOpacity key={t.bucket} accessibilityRole="button" accessibilityLabel={`Account type ${t.label}`} accessibilityState={{ selected: bucket === t.bucket }} style={[styles.chip, bucket === t.bucket && styles.chipOn]} onPress={() => setBucket(t.bucket)}><Text style={[styles.chipT, bucket === t.bucket && styles.chipTOn]}>{t.label}</Text></TouchableOpacity>
          ))}</View>
          {bond && (
            <View style={styles.sellBox}>
              <Text style={styles.sellTitle}>🔻 Record a sale</Text>
              <Text style={styles.fieldHint}>Sold this bond (or part of it) on the secondary market before maturity? Enter the proceeds to lower or close the position. To just re-mark its price, edit “Current value” above.</Text>
              <View style={styles.sellRow}>
                <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" value={sellAmt} onChangeText={setSellAmt}
                  placeholder={`amount sold (up to ${money(num(value) > 0 ? num(value) : num(face))})`} placeholderTextColor={Colors.textTertiary} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record sale" style={[styles.sellBtn, !(num(sellAmt) > 0) && { opacity: 0.4 }]} disabled={!(num(sellAmt) > 0)} onPress={applySale}>
                  <Text style={styles.sellBtnT}>Record</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sold the whole position" onPress={() => setSellAmt(String(num(value) > 0 ? num(value) : num(face)))}><Text style={styles.sellAll}>Sold the whole position →</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={save}><Text style={styles.saveBtnT}>{bond ? 'Save' : 'Add bond'}</Text></TouchableOpacity>
          {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete bond" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={onDelete}><Text style={styles.deleteLink}>Delete bond</Text></TouchableOpacity>}
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 10 },
  empty: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  addBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  addLink: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark, marginTop: 10, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: 12, textAlign: 'center', backgroundColor: Colors.primaryLight, overflow: 'hidden' },
  foot: { fontSize: 11.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: 10, alignItems: 'center' },
  sumVal: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  // P0 (design audit B-1): stat labels never below the 11pt kicker floor
  sumCellL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  sumCellV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  bondHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bondName: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary, paddingRight: 8 },
  bondVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  bondSub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 3 },
  bondMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  metric: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  fieldHint: { fontSize: 11, color: Colors.textTertiary, lineHeight: 15, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  note: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipT: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  chipTOn: { color: Colors.primaryDark },
  sellBox: { marginTop: 18, padding: 12, borderRadius: Radii.md, backgroundColor: Colors.bgSecondary, borderWidth: 1, borderColor: Colors.border },
  sellTitle: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  sellRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  sellBtn: { backgroundColor: Colors.textPrimary, borderRadius: Radii.md, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  sellBtnT: { color: '#fff', fontSize: 14, fontWeight: '800' },
  sellAll: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4, paddingVertical: 12, minHeight: 44, textAlignVertical: 'center' },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
