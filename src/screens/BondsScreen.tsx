// Bonds — individual bond management (Phase B). Bonds are AssetAccounts with bond fields, so they
// already flow into Net Worth + the nest egg; here we add/edit them and show bond-specific metrics.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { type AssetAccount, type TaxBucket } from '../domain/assets';
import { isBond, bondInfo, annualCoupon, yearsToMaturity, currentYield, approxYTM, bondSummary } from '../domain/bonds';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
const ACCT_TYPES: { label: string; bucket: TaxBucket }[] = [
  { label: 'Taxable', bucket: 'TAXABLE' }, { label: 'Trad IRA / 401k', bucket: 'PRE_TAX' }, { label: 'Roth', bucket: 'ROTH' },
];

export default function BondsScreen() {
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const bonds = useMemo(() => accounts.filter(isBond), [accounts]);
  const summary = useMemo(() => bondSummary(bonds.map(bondInfo)), [bonds]);
  const [edit, setEdit] = useState<AssetAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.h1}>Bonds</Text>

      {bonds.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>Track individual bonds — Treasuries, CDs, muni or corporate bonds — with their coupon income, maturity, and yield. They count toward your net worth and retirement nest egg.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add a bond</Text></TouchableOpacity>
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
              <TouchableOpacity key={a.asset_id} style={styles.card} onPress={() => setEdit(a)}>
                <View style={styles.bondHead}><Text style={styles.bondName} numberOfLines={1}>{a.institution?.trim() || a.label}</Text><Text style={styles.bondVal}>{money(a.balance || 0)}</Text></View>
                <Text style={styles.bondSub}>face {money(bi.face)} · {(bi.couponRate * 100).toFixed(2)}% coupon · matures {bi.maturity}{yrs > 0 ? ` (${yrs.toFixed(1)}y)` : ' (matured)'}</Text>
                <View style={styles.bondMetrics}>
                  <Text style={styles.metric}>{money(annualCoupon(bi))}/yr coupon</Text>
                  <Text style={styles.metric}>yield {pct(currentYield(bi))}</Text>
                  <Text style={styles.metric}>YTM {pct(approxYTM(bi))}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add a bond</Text></TouchableOpacity>
          <Text style={styles.foot}>Coupons are paid as cash and counted as investment income. Value is what you enter (held at cost/quote — no live bond pricing). YTM is an estimate.</Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <BondEditor bond={addOpen ? null : edit} open={addOpen || edit != null} onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(fields) => {
          if (edit) store.updateAsset(edit.asset_id, fields);
          else store.addAsset({ kind: 'fixed_income', target_return: fields.coupon_rate ?? 0.04, ...fields });
          setAddOpen(false); setEdit(null);
        }}
        onDelete={edit ? () => { store.deleteAsset(edit.asset_id); setEdit(null); } : undefined} />
    </ScrollView>
  );
}

function BondEditor({ bond, open, onClose, onSave, onDelete }: {
  bond: AssetAccount | null; open: boolean; onClose: () => void; onSave: (f: Partial<AssetAccount>) => void; onDelete?: () => void;
}) {
  const [label, setLabel] = useState('');
  const [face, setFace] = useState('');
  const [coupon, setCoupon] = useState('');
  const [maturity, setMaturity] = useState('');
  const [value, setValue] = useState('');
  const [bucket, setBucket] = useState<TaxBucket>('TAXABLE');
  React.useEffect(() => {
    if (!open) return;
    setLabel(bond?.label ?? ''); setFace(bond?.face_value ? String(bond.face_value) : '');
    setCoupon(bond?.coupon_rate ? String(bond.coupon_rate * 100) : ''); setMaturity(bond?.maturity_date ?? '');
    setValue(bond ? String(bond.balance ?? '') : ''); setBucket(bond?.tax_bucket ?? 'TAXABLE');
  }, [open]);
  const valid = label.trim() && num(face) > 0 && num(coupon) >= 0 && /^\d{4}-\d{2}-\d{2}$/.test(maturity.trim());
  const save = () => onSave({
    label: label.trim(), tax_bucket: bucket,
    face_value: num(face), coupon_rate: num(coupon) / 100, maturity_date: maturity.trim(),
    balance: num(value) > 0 ? num(value) : num(face),   // default value to face if blank
  });
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%' }}>
          <Text style={styles.sheetT}>{bond ? 'Edit bond' : 'Add a bond'}</Text>
          <Text style={styles.fieldL}>Name / issuer</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. US Treasury 2030, Apple Corp 4.5%" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Face (par) value</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={face} onChangeText={setFace} placeholder="10000" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Coupon rate (% per year)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={coupon} onChangeText={setCoupon} placeholder="4.5" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Maturity date</Text>
          <TextInput style={styles.input} value={maturity} onChangeText={setMaturity} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Current value (blank = face value)</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={setValue} placeholder="what it's worth now" placeholderTextColor={Colors.textTertiary} />
          {valid && num(face) > 0 && <Text style={styles.note}>~{money(num(face) * (num(coupon) / 100))}/yr in coupon income.</Text>}
          <Text style={styles.fieldL}>Account</Text>
          <View style={styles.chips}>{ACCT_TYPES.map((t) => (
            <TouchableOpacity key={t.bucket} style={[styles.chip, bucket === t.bucket && styles.chipOn]} onPress={() => setBucket(t.bucket)}><Text style={[styles.chipT, bucket === t.bucket && styles.chipTOn]}>{t.label}</Text></TouchableOpacity>
          ))}</View>
          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid} onPress={save}><Text style={styles.saveBtnT}>{bond ? 'Save' : 'Add bond'}</Text></TouchableOpacity>
          {onDelete && <TouchableOpacity onPress={onDelete}><Text style={styles.deleteLink}>Delete bond</Text></TouchableOpacity>}
          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg },
  h1: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 8 },
  card: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.md, marginBottom: 10 },
  empty: { fontSize: 13.5, color: Colors.textSecondary, lineHeight: 20 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  addBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  addLink: { fontSize: 13.5, fontWeight: '700', color: Colors.primary, marginTop: 2 },
  foot: { fontSize: 10.5, color: Colors.textTertiary, lineHeight: 14.5, marginTop: 12 },
  summary: { backgroundColor: Colors.cardBg, borderRadius: Radii.lg, padding: Spacing.base, marginBottom: 10, alignItems: 'center' },
  sumVal: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  sumLab: { fontSize: 12, color: Colors.textTertiary, marginTop: 1 },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  sumCellL: { fontSize: 9, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
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
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
  note: { fontSize: 12, color: Colors.textSecondary, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipT: { fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary },
  chipTOn: { color: Colors.primaryDark },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  saveBtnT: { color: '#fff', fontSize: 15, fontWeight: '800' },
  deleteLink: { fontSize: 13, fontWeight: '700', color: Colors.red, textAlign: 'center', marginTop: 14 },
});
