// Other investments (Phase C) — alternatives (crypto, PE, hedge funds, commodities, annuities, other)
// held at a manual value as AssetAccounts, so they flow to Net Worth + nest egg. Third management
// surface alongside Performance (stocks/ETFs) and Bonds.
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useStore } from '../store/useStore';
import { Colors, Spacing, Radii } from '../utils/theme';
import { money } from '../domain/_shared/num';
import { InfoDot } from '../components/UI';
import { assetKind, benchmarkReturn, investableAssets, type AssetAccount, type TaxBucket } from '../domain/assets';
import { isAlternative, alternativesSummary, ALT_KINDS } from '../domain/alternatives';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const ALT_HINT: Record<string, string> = {
  crypto: 'Highly volatile — size it accordingly.',
  private_equity: 'Illiquid; values are estimates until a sale.',
  hedge_funds: 'Often illiquid with lock-ups.',
  commodities: 'No income; a diversifier / inflation hedge.',
  annuities: 'An income product — guaranteed payments.',
  other_asset: 'Anything else of value.',
};
const BUCKETS: { label: string; bucket: TaxBucket }[] = [
  { label: 'Taxable', bucket: 'TAXABLE' }, { label: 'Trad IRA / 401k', bucket: 'PRE_TAX' }, { label: 'Roth', bucket: 'ROTH' },
];

export default function OtherInvestmentsScreen() {
  const store = useStore() as any;
  const accounts: AssetAccount[] = store.assetAccounts ?? [];
  const alts = useMemo(() => accounts.filter(isAlternative), [accounts]);
  const summary = useMemo(() => alternativesSummary(accounts), [accounts]);
  const investable = investableAssets(accounts);
  const sharePct = investable > 0 ? Math.round((summary.totalValue / investable) * 1000) / 10 : 0;
  const [edit, setEdit] = useState<AssetAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: Colors.bgSecondary }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.h1}>Alternatives</Text><InfoDot term="alternatives" /></View>

      {alts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>Track alternatives — crypto, private equity, hedge funds, commodities, annuities — at a value you set. They count toward your net worth and retirement nest egg.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}><Text style={styles.addBtnT}>＋ Add an investment</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <Text style={styles.sumVal}>{money(summary.totalValue)}</Text>
            <Text style={styles.sumLab}>{summary.count} holding{summary.count > 1 ? 's' : ''} · {sharePct}% of your investable assets</Text>
            <View style={styles.sumRow}>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>EXP. RETURN</Text><Text style={styles.sumCellV}>{(summary.blendedReturn * 100).toFixed(1)}%</Text></View>
              <View style={styles.sumCell}><Text style={styles.sumCellL}>EST. GROWTH / YR</Text><Text style={[styles.sumCellV, { color: Colors.primary }]}>{money(summary.estAnnualGrowth)}</Text></View>
            </View>
          </View>

          {alts.map((a) => (
            <TouchableOpacity key={a.asset_id} accessibilityRole="button" accessibilityLabel={`Edit ${a.label}, ${money(a.balance || 0)}`} style={styles.card} onPress={() => setEdit(a)}>
              <View style={styles.row}><Text style={styles.name} numberOfLines={1}>{a.label}</Text><Text style={styles.val}>{money(a.balance || 0)}</Text></View>
              <Text style={styles.sub}>{a.institution?.trim() ? `${a.institution.trim()} · ` : ''}{assetKind(a.kind)?.label ?? 'Other'} · ~{(benchmarkReturn(a.kind) * 100).toFixed(1)}%/yr expected</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add an investment" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setAddOpen(true)}><Text style={styles.addLink}>＋ Add an investment</Text></TouchableOpacity>
          <Text style={styles.foot}>Values are what you enter (no live pricing for alternatives). Expected returns are historical class benchmarks, not guarantees.</Text>
        </>
      )}

      <View style={{ height: 40 }} />
      <AltEditor item={addOpen ? null : edit} open={addOpen || edit != null} onClose={() => { setAddOpen(false); setEdit(null); }}
        onSave={(fields) => {
          if (edit) store.updateAsset(edit.asset_id, fields);
          else store.addAsset({ target_return: benchmarkReturn(fields.kind), ...fields });
          setAddOpen(false); setEdit(null);
        }}
        onDelete={edit ? () => { store.deleteAsset(edit.asset_id); setEdit(null); } : undefined} />
    </ScrollView>
  );
}

function AltEditor({ item, open, onClose, onSave, onDelete }: {
  item: AssetAccount | null; open: boolean; onClose: () => void; onSave: (f: Partial<AssetAccount>) => void; onDelete?: () => void;
}) {
  const [kind, setKind] = useState<string>('crypto');
  const [label, setLabel] = useState('');
  const [inst, setInst] = useState('');
  const [value, setValue] = useState('');
  const [bucket, setBucket] = useState<TaxBucket>('TAXABLE');
  const [sellAmt, setSellAmt] = useState('');
  React.useEffect(() => {
    if (!open) return;
    setKind(item?.kind ?? 'crypto'); setLabel(item?.label ?? ''); setInst(item?.institution ?? ''); setValue(item ? String(item.balance ?? '') : ''); setBucket(item?.tax_bucket ?? 'TAXABLE'); setSellAmt('');
  }, [open]);
  const valid = label.trim().length > 0 && num(value) > 0;
  // Alternatives are sellable too (e.g. an American option before expiration, crypto, a fund stake).
  // Record a full sale (closes it) or a partial sale (lowers the value). Mark-to-market = edit "Current value".
  const applySale = () => {
    const sold = num(sellAmt); const cur = num(value); if (sold <= 0 || cur <= 0) return;
    const full = sold >= cur - 0.005;
    Alert.alert(
      full ? 'Close this investment?' : 'Record a sale?',
      full ? `Marks all ${money(cur)} as sold and removes it from your holdings.`
           : `Lowers ${label.trim() || 'this investment'} from ${money(cur)} to ${money(cur - sold)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: full ? 'Close position' : 'Record sale', onPress: () => {
          if (full) onDelete?.();
          else onSave({ kind, label: label.trim(), institution: inst.trim(), balance: Math.round((cur - sold) * 100) / 100, tax_bucket: bucket });
        } },
      ],
    );
  };
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />
        <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" style={{ maxHeight: '90%' }}>
          <Text style={styles.sheetT}>{item ? 'Edit investment' : 'Add an investment'}</Text>
          <Text style={styles.fieldL}>Type</Text>
          <View style={styles.chips}>{ALT_KINDS.map((k) => (
            <TouchableOpacity key={k} style={[styles.chip, kind === k && styles.chipOn]} onPress={() => setKind(k)}><Text style={[styles.chipT, kind === k && styles.chipTOn]}>{assetKind(k)?.label ?? 'Other'}</Text></TouchableOpacity>
          ))}</View>
          <Text style={styles.hint}>{ALT_HINT[kind]} ~{(benchmarkReturn(kind) * 100).toFixed(1)}%/yr historical benchmark.</Text>
          <Text style={styles.fieldL}>Name</Text>
          <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="e.g. Bitcoin, Fund III, Gold" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Where it's held (institution)</Text>
          <TextInput style={styles.input} value={inst} onChangeText={setInst} placeholder="e.g. Coinbase, Chase — optional" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Current value</Text>
          <TextInput style={styles.input} keyboardType="decimal-pad" value={value} onChangeText={setValue} placeholder="0" placeholderTextColor={Colors.textTertiary} />
          <Text style={styles.fieldL}>Account</Text>
          <View style={styles.chips}>{BUCKETS.map((b) => (
            <TouchableOpacity key={b.bucket} style={[styles.chip, bucket === b.bucket && styles.chipOn]} onPress={() => setBucket(b.bucket)}><Text style={[styles.chipT, bucket === b.bucket && styles.chipTOn]}>{b.label}</Text></TouchableOpacity>
          ))}</View>
          {item && (
            <View style={styles.sellBox}>
              <Text style={styles.sellTitle}>🔻 Record a sale</Text>
              <Text style={styles.hint}>Sold this (or part of it) — e.g. an option before expiration, or some crypto? Enter the proceeds to lower or close the position. To re-mark its price, edit “Current value” above.</Text>
              <View style={styles.sellRow}>
                <TextInput style={[styles.input, { flex: 1 }]} keyboardType="decimal-pad" value={sellAmt} onChangeText={setSellAmt}
                  placeholder={`amount sold (up to ${money(num(value))})`} placeholderTextColor={Colors.textTertiary} />
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Record sale" style={[styles.sellBtn, !(num(sellAmt) > 0) && { opacity: 0.4 }]} disabled={!(num(sellAmt) > 0)} onPress={applySale}>
                  <Text style={styles.sellBtnT}>Record</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sold all of it" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setSellAmt(String(num(value)))}><Text style={styles.sellAll}>Sold all of it →</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={[styles.saveBtn, !valid && { opacity: 0.4 }]} disabled={!valid}
            onPress={() => onSave({ kind, label: label.trim(), institution: inst.trim(), balance: num(value), tax_bucket: bucket })}>
            <Text style={styles.saveBtnT}>{item ? 'Save' : 'Add'}</Text>
          </TouchableOpacity>
          {onDelete && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Delete this holding" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => Alert.alert('Delete this holding?', `Removes ${label.trim() || 'this investment'} from your holdings.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onDelete }])}><Text style={styles.deleteLink}>Delete</Text></TouchableOpacity>}
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
  sumLab: { fontSize: 12, color: Colors.textTertiary, marginTop: 1, textAlign: 'center' },
  sumRow: { flexDirection: 'row', marginTop: 14, alignSelf: 'stretch' },
  sumCell: { flex: 1, alignItems: 'center' },
  // P0 (design audit OI-1): stat labels never below the 11pt kicker floor
  sumCellL: { fontSize: 11, fontWeight: '800', color: Colors.textTertiary, letterSpacing: 0.3 },
  sumCellV: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: Colors.textPrimary, paddingRight: 8 },
  val: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 11.5, color: Colors.textSecondary, marginTop: 3 },
  scrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' } as any,
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 12 },
  sheetT: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  fieldL: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 14, marginBottom: 5 },
  hint: { fontSize: 11.5, color: Colors.textTertiary, marginTop: 6, lineHeight: 15 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radii.md, padding: 12, fontSize: 16, color: Colors.textPrimary },
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
